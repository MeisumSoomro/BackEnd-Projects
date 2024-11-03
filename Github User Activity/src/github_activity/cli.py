import argparse
import sys
from github_activity.api.github_api import get_user_activity, parse_user_activity


def main():
    parser = argparse.ArgumentParser(
        description="View recent GitHub activity for any user"
    )
    parser.add_argument(
        "username",
        help="GitHub username to fetch activity for"
    )

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(1)

    args = parser.parse_args()
    
    print(f"\nFetching recent activity for user: {args.username}")
    print("=" * 50)
    
    activities = get_user_activity(args.username)
    if activities:
        user_activities = parse_user_activity(activities)
        print("\nRecent GitHub Activity:")
        print("-" * 50)
        for activity in user_activities:
            print(activity)
    print("\n")


if __name__ == "__main__":
    main() 