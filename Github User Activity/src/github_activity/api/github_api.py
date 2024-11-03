import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def get_user_activity(user):
    try:
        url = f"https://api.github.com/users/{user}/events/public"
        headers = {
            'User-Agent': 'GitHub-Activity-Viewer'  # GitHub API requires a user agent
        }
        request = Request(url, headers=headers)
        with urlopen(request) as response:
            return json.loads(response.read().decode())
    except HTTPError as error:
        if error.code == 404:
            print(f"Error: User '{user}' not found.")
        else:
            print(f"HTTP Error {error.code}: {error.reason}")
    except URLError as error:
        print(f"Connection Error: {error.reason}")
    except Exception as error:
        print(f"Error: {error}")
    return None


def parse_user_activity(activities):
    if not activities:
        return ["No activities found."]
    
    user_activities = []
    for activity in activities[:10]:  # Limit to last 10 activities
        user = activity['actor']['login']
        repo = activity['repo']['name']
        event_type = activity['type']

        if event_type == 'CreateEvent':
            user_activities.append(f"🆕 {user} created repository {repo}")
        elif event_type == 'PushEvent':
            commits = len(activity['payload']['commits'])
            user_activities.append(
                f"📝 {user} pushed {commits} commit{'s' if commits > 1 else ''} to {repo}")
        elif event_type == 'WatchEvent':
            user_activities.append(f"⭐ {user} starred {repo}")
        elif event_type == 'IssuesEvent':
            action = activity['payload']['action']
            user_activities.append(f"❗ {user} {action} issue in {repo}")
        elif event_type == 'IssueCommentEvent':
            user_activities.append(f"💬 {user} commented on issue in {repo}")
        elif event_type == 'ForkEvent':
            user_activities.append(f"🔱 {user} forked {repo}")
        elif event_type == 'PublicEvent':
            user_activities.append(f"🌍 {user} made {repo} public")
        elif event_type == 'PullRequestEvent':
            action = activity['payload']['action']
            user_activities.append(f"🔄 {user} {action} pull request in {repo}")
        else:
            user_activities.append(f"➡️ {user} performed {event_type} on {repo}")
    
    return user_activities