import json
import sys
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from datetime import datetime, timedelta
import tempfile
import time


class Cache:
    """Simple file-based cache for GitHub API responses."""
    
    def __init__(self, cache_dir=None):
        """Initialize cache with optional custom directory."""
        if cache_dir is None:
            cache_dir = os.path.join(tempfile.gettempdir(), 'github_activity_cache')
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_file(self, username, event_type=None):
        """Get cache file path for a specific user and event type."""
        filename = f"{username}_{event_type if event_type else 'all'}.json"
        return os.path.join(self.cache_dir, filename)
    
    def get(self, username, event_type=None):
        """Get cached data if it exists and is not expired."""
        cache_file = self._get_cache_file(username, event_type)
        if not os.path.exists(cache_file):
            return None
            
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
                # Check if cache is expired (5 minutes)
                if datetime.now().timestamp() - data['timestamp'] > 300:
                    return None
                return data['activities']
        except (json.JSONDecodeError, KeyError, IOError):
            return None
    
    def set(self, username, activities, event_type=None):
        """Cache the activities data."""
        cache_file = self._get_cache_file(username, event_type)
        try:
            with open(cache_file, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().timestamp(),
                    'activities': activities
                }, f)
        except IOError:
            pass  # Silently fail if we can't cache


# Initialize cache
cache = Cache()


GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
RATE_LIMIT_REMAINING = 60  # Default unauthenticated rate limit


def make_github_request(url):
    """Make a GitHub API request with rate limit handling."""
    global RATE_LIMIT_REMAINING
    
    headers = {
        'User-Agent': 'GitHub-Activity-CLI'
    }
    
    if GITHUB_TOKEN:
        headers['Authorization'] = f'token {GITHUB_TOKEN}'
    
    try:
        request = Request(url, headers=headers)
        with urlopen(request) as response:
            # Update rate limit from response headers
            RATE_LIMIT_REMAINING = int(response.headers.get('X-RateLimit-Remaining', RATE_LIMIT_REMAINING))
            
            # If we're running low on requests, warn the user
            if RATE_LIMIT_REMAINING < 10:
                print(f"\nWarning: Only {RATE_LIMIT_REMAINING} API requests remaining!")
                
            # If we're out of requests, handle rate limiting
            if RATE_LIMIT_REMAINING == 0:
                reset_time = int(response.headers.get('X-RateLimit-Reset', 0))
                wait_time = reset_time - int(time.time())
                if wait_time > 0:
                    print(f"\nRate limit exceeded. Waiting {wait_time} seconds...")
                    time.sleep(wait_time)
            
            return json.loads(response.read().decode())
    except HTTPError as error:
        if error.code == 403 and 'rate limit exceeded' in str(error.reason).lower():
            print("\nRate limit exceeded. Please try again later or use a GitHub token.")
            print("Set your token as GITHUB_TOKEN environment variable.")
        raise


def get_user_activity(username, event_type=None, limit=10, use_cache=True):
    """
    Fetch user's GitHub activity using the GitHub API.
    
    Args:
        username (str): GitHub username
        event_type (str, optional): Filter by event type
        limit (int, optional): Number of activities to return
        use_cache (bool): Whether to use cached data
    """
    if use_cache:
        cached_data = cache.get(username, event_type)
        if cached_data:
            print("(Using cached data)")
            return cached_data[:limit]
    
    try:
        url = f"https://api.github.com/users/{username}/events"
        activities = make_github_request(url)
        
        if event_type:
            activities = [a for a in activities if a['type'] == event_type]
        
        if use_cache:
            cache.set(username, activities, event_type)
        
        return activities[:limit]
            
    except HTTPError as error:
        if error.code == 404:
            print(f"Error: User '{username}' not found")
        else:
            print(f"Error: Failed to fetch data (HTTP {error.code})")
    except URLError:
        print("Error: Failed to connect to GitHub API")
        # Try to use cached data as fallback
        if use_cache:
            cached_data = cache.get(username, event_type)
            if cached_data:
                print("(Using cached data as fallback)")
                return cached_data[:limit]
    except Exception as error:
        print(f"Error: {str(error)}")
    return None


def format_timestamp(timestamp):
    """Convert GitHub timestamp to readable format."""
    dt = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def parse_user_activity(activities, detailed=False):
    """
    Parse GitHub activities into readable format.
    
    Args:
        activities (list): List of GitHub activities
        detailed (bool): Whether to show detailed information
    """
    if not activities:
        return ["No activities found"]
    
    parsed_activities = []
    for activity in activities:
        event_type = activity['type']
        repo = activity['repo']['name']
        timestamp = format_timestamp(activity['created_at'])
        
        base_info = f"[{timestamp}] "
        
        if event_type == 'PushEvent':
            commits = len(activity['payload']['commits'])
            message = f"Pushed {commits} commit{'s' if commits > 1 else ''} to {repo}"
            if detailed:
                commit_messages = [c['message'] for c in activity['payload']['commits']]
                message += f"\n  Commits: {', '.join(commit_messages)}"
        
        elif event_type == 'CreateEvent':
            ref_type = activity['payload'].get('ref_type', 'repository')
            message = f"Created {ref_type} in {repo}"
        
        elif event_type == 'WatchEvent':
            message = f"Starred {repo}"
        
        elif event_type == 'ForkEvent':
            message = f"Forked {repo}"
        
        elif event_type == 'IssuesEvent':
            action = activity['payload']['action']
            issue_number = activity['payload']['issue']['number']
            message = f"{action.capitalize()} issue #{issue_number} in {repo}"
            if detailed:
                title = activity['payload']['issue']['title']
                message += f"\n  Title: {title}"
        
        elif event_type == 'PullRequestEvent':
            action = activity['payload']['action']
            pr_number = activity['payload']['pull_request']['number']
            message = f"{action.capitalize()} pull request #{pr_number} in {repo}"
            if detailed:
                title = activity['payload']['pull_request']['title']
                message += f"\n  Title: {title}"
        
        else:
            message = f"{event_type} on {repo}"
            
        parsed_activities.append(base_info + message)
    
    return parsed_activities


def print_available_events():
    """Print list of available event types."""
    events = [
        "PushEvent - Code pushes",
        "CreateEvent - Repository/branch creation",
        "WatchEvent - Repository starring",
        "ForkEvent - Repository forking",
        "IssuesEvent - Issue activity",
        "PullRequestEvent - Pull request activity",
        "PublicEvent - Repository made public",
        "IssueCommentEvent - Comments on issues"
    ]
    print("\nAvailable event types:")
    for event in events:
        print(f"- {event}")


def get_user_profile(username):
    """Fetch user profile information from GitHub API."""
    try:
        url = f"https://api.github.com/users/{username}"
        return make_github_request(url)
    except (HTTPError, URLError, Exception):
        return None


def format_user_profile(profile):
    """Format user profile information for display."""
    if not profile:
        return None
    
    info = []
    info.append(f"\nUser Profile: {profile['login']}")
    info.append("=" * 50)
    
    # Basic information
    info.append(f"Name: {profile.get('name', 'Not specified')}")
    info.append(f"Location: {profile.get('location', 'Not specified')}")
    info.append(f"Bio: {profile.get('bio', 'Not specified')}")
    
    # Statistics
    info.append(f"\nStatistics:")
    info.append(f"Public Repositories: {profile['public_repos']}")
    info.append(f"Followers: {profile['followers']}")
    info.append(f"Following: {profile['following']}")
    
    # Profile links
    if profile.get('blog'):
        info.append(f"\nBlog: {profile['blog']}")
    info.append(f"GitHub: {profile['html_url']}")
    
    return "\n".join(info)


def get_user_repos(username):
    """Fetch user's repositories from GitHub API."""
    try:
        url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=100"
        return make_github_request(url)
    except (HTTPError, URLError, Exception):
        return None


def get_repo_languages(username, repo_name):
    """Fetch language statistics for a repository."""
    try:
        url = f"https://api.github.com/repos/{username}/{repo_name}/languages"
        return make_github_request(url)
    except (HTTPError, URLError, Exception):
        return None


def format_repo_stats(repos):
    """Format repository statistics for display."""
    if not repos:
        return None
    
    info = []
    info.append("\nRepository Statistics")
    info.append("=" * 50)
    
    # Sort repos by stars
    starred_repos = sorted(repos, key=lambda x: x['stargazers_count'], reverse=True)
    
    # Top starred repositories
    info.append("\nMost Starred Repositories:")
    for repo in starred_repos[:5]:
        stars = repo['stargazers_count']
        forks = repo['forks_count']
        info.append(f"- {repo['name']}: ⭐ {stars} | 🔱 {forks}")
        if repo['description']:
            info.append(f"  Description: {repo['description']}")
    
    # Language statistics
    languages = {}
    for repo in repos:
        repo_languages = get_repo_languages(repo['owner']['login'], repo['name'])
        if repo_languages:
            for lang, bytes_count in repo_languages.items():
                languages[lang] = languages.get(lang, 0) + bytes_count
    
    if languages:
        total_bytes = sum(languages.values())
        info.append("\nLanguage Distribution:")
        for lang, bytes_count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
            percentage = (bytes_count / total_bytes) * 100
            info.append(f"- {lang}: {percentage:.1f}%")
    
    # Repository types
    public_count = len(repos)
    fork_count = len([r for r in repos if r['fork']])
    source_count = public_count - fork_count
    
    info.append("\nRepository Overview:")
    info.append(f"- Total Public Repositories: {public_count}")
    info.append(f"- Source Repositories: {source_count}")
    info.append(f"- Forked Repositories: {fork_count}")
    
    return "\n".join(info)


def get_user_contributions(username):
    """Fetch user's commit contributions from GitHub API."""
    try:
        # Note: This is a workaround as GitHub's API doesn't directly provide contribution data
        url = f"https://api.github.com/users/{username}/events"
        headers = {
            'User-Agent': 'GitHub-Activity-CLI'
        }
        request = Request(url, headers=headers)
        with urlopen(request) as response:
            events = json.loads(response.read().decode())
            return [e for e in events if e['type'] == 'PushEvent']
    except (HTTPError, URLError, Exception):
        return None


def get_commit_details(username, repo, commit_sha):
    """Fetch detailed commit information."""
    try:
        url = f"https://api.github.com/repos/{username}/{repo}/commits/{commit_sha}"
        headers = {
            'User-Agent': 'GitHub-Activity-CLI'
        }
        request = Request(url, headers=headers)
        with urlopen(request) as response:
            return json.loads(response.read().decode())
    except (HTTPError, URLError, Exception):
        return None


def format_contribution_stats(username, push_events):
    """Format contribution statistics for display."""
    if not push_events:
        return None
    
    info = []
    info.append("\nContribution Statistics")
    info.append("=" * 50)
    
    # Analyze commit patterns
    commits_by_repo = {}
    commits_by_day = {}
    total_additions = 0
    total_deletions = 0
    
    for event in push_events:
        repo = event['repo']['name']
        commits = event['payload']['commits']
        
        # Count commits per repository
        commits_by_repo[repo] = commits_by_repo.get(repo, 0) + len(commits)
        
        # Count commits per day
        day = event['created_at'][:10]  # YYYY-MM-DD
        commits_by_day[day] = commits_by_day.get(day, 0) + len(commits)
        
        # Get detailed commit information for the first commit
        if commits:
            commit_detail = get_commit_details(username, repo.split('/')[-1], commits[0]['sha'])
            if commit_detail and 'stats' in commit_detail:
                total_additions += commit_detail['stats'].get('additions', 0)
                total_deletions += commit_detail['stats'].get('deletions', 0)
    
    # Most active repositories
    info.append("\nMost Active Repositories:")
    for repo, count in sorted(commits_by_repo.items(), key=lambda x: x[1], reverse=True)[:5]:
        info.append(f"- {repo}: {count} commits")
    
    # Recent commit activity
    info.append("\nRecent Commit Activity:")
    for day, count in sorted(commits_by_day.items(), reverse=True)[:7]:
        info.append(f"- {day}: {count} commits")
    
    # Code changes
    if total_additions > 0 or total_deletions > 0:
        info.append("\nRecent Code Changes:")
        info.append(f"- Additions: +{total_additions}")
        info.append(f"- Deletions: -{total_deletions}")
        info.append(f"- Net changes: {total_additions - total_deletions:+}")
    
    return "\n".join(info)


def get_user_organizations(username):
    """Fetch user's organizations from GitHub API."""
    try:
        url = f"https://api.github.com/users/{username}/orgs"
        headers = {
            'User-Agent': 'GitHub-Activity-CLI'
        }
        request = Request(url, headers=headers)
        with urlopen(request) as response:
            return json.loads(response.read().decode())
    except (HTTPError, URLError, Exception):
        return None


def get_org_repos(org_name):
    """Fetch organization's repositories."""
    try:
        url = f"https://api.github.com/orgs/{org_name}/repos"
        headers = {
            'User-Agent': 'GitHub-Activity-CLI'
        }
        request = Request(url, headers=headers)
        with urlopen(request) as response:
            return json.loads(response.read().decode())
    except (HTTPError, URLError, Exception):
        return None


def format_org_activity(username, orgs):
    """Format organization activity statistics for display."""
    if not orgs:
        return None
    
    info = []
    info.append("\nOrganization Activity")
    info.append("=" * 50)
    
    # Organization overview
    info.append(f"\nMember of {len(orgs)} organizations:")
    for org in orgs:
        info.append(f"\n📍 {org['login']}")
        info.append(f"  Description: {org.get('description', 'No description')}")
        
        # Get organization's repositories
        org_repos = get_org_repos(org['login'])
        if org_repos:
            # Find repos where user has contributed
            user_contrib_repos = []
            for repo in org_repos:
                try:
                    url = f"https://api.github.com/repos/{org['login']}/{repo['name']}/contributors"
                    headers = {'User-Agent': 'GitHub-Activity-CLI'}
                    request = Request(url, headers=headers)
                    with urlopen(request) as response:
                        contributors = json.loads(response.read().decode())
                        if any(c['login'].lower() == username.lower() for c in contributors):
                            user_contrib_repos.append(repo)
                except:
                    continue
            
            if user_contrib_repos:
                info.append(f"\n  Contributed to {len(user_contrib_repos)} repositories:")
                for repo in user_contrib_repos[:5]:  # Show top 5 repos
                    info.append(f"  - {repo['name']}")
                    if repo['description']:
                        info.append(f"    {repo['description']}")
                    info.append(f"    Stars: {repo['stargazers_count']} | Forks: {repo['forks_count']}")
    
    return "\n".join(info)


def main():
    """Main function to run the GitHub Activity CLI."""
    if len(sys.argv) < 2:
        print("Usage: github-activity <username> [options]")
        print("\nOptions:")
        print("  --type TYPE    Filter by event type")
        print("  --limit N      Limit number of activities (default: 10)")
        print("  --detailed     Show detailed information")
        print("  --events       List available event types")
        print("  --profile      Show user profile information")
        print("  --repos        Show repository statistics")
        print("  --contrib      Show contribution statistics")
        print("  --orgs         Show organization activity")
        print("  --all          Show all information")
        print("\nExample: github-activity octocat --all")
        sys.exit(1)

    username = sys.argv[1]
    event_type = None
    limit = 10
    detailed = False
    show_profile = False
    show_repos = False
    show_contributions = False
    show_orgs = False

    # Parse command line arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--events':
            print_available_events()
            sys.exit(0)
        elif sys.argv[i] == '--type' and i + 1 < len(sys.argv):
            event_type = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--limit' and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--detailed':
            detailed = True
            i += 1
        elif sys.argv[i] == '--profile':
            show_profile = True
            i += 1
        elif sys.argv[i] == '--repos':
            show_repos = True
            i += 1
        elif sys.argv[i] == '--contrib':
            show_contributions = True
            i += 1
        elif sys.argv[i] == '--orgs':
            show_orgs = True
            i += 1
        elif sys.argv[i] == '--all':
            show_profile = True
            show_repos = True
            show_contributions = True
            show_orgs = True
            detailed = True
            i += 1
        else:
            i += 1

    print(f"\nFetching GitHub information for {username}...")
    print("=" * 50)

    # Show authentication status
    if GITHUB_TOKEN:
        print("✓ Using GitHub authentication token")
    else:
        print("! No GitHub token found. Using unauthenticated requests (rate limited)")
        print("  Set GITHUB_TOKEN environment variable to increase rate limits")
    print("=" * 50)

    # Fetch and display user profile if requested
    if show_profile:
        profile = get_user_profile(username)
        if profile:
            print(format_user_profile(profile))
        print("\n" + "=" * 50)

    # Add after profile display
    if show_repos:
        repos = get_user_repos(username)
        if repos:
            print(format_repo_stats(repos))
        print("\n" + "=" * 50)

    # Add after repos display
    if show_contributions:
        push_events = get_user_contributions(username)
        if push_events:
            print(format_contribution_stats(username, push_events))
        print("\n" + "=" * 50)

    # Add after contributions display
    if show_orgs:
        orgs = get_user_organizations(username)
        if orgs:
            print(format_org_activity(username, orgs))
        print("\n" + "=" * 50)

    # Always show recent activity
    if event_type:
        print(f"\nFiltering activity by event type: {event_type}")
    
    activities = get_user_activity(username, event_type, limit)
    if activities:
        print("\nRecent Activity:")
        print("-" * 50)
        for activity in parse_user_activity(activities, detailed):
            print(activity)

    print("\n")


if __name__ == "__main__":
    main() 