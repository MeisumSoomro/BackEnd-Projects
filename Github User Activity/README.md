# GITHUB USER ACTIVITY

Github User Activity is a command-line tool that allows you to get the activity of a user on Github. You can get the type of different events that a user has performed on Github, such as creating a repository, opening an issue, etc.

## Installation

Clone this repository to your local machine:

```bash
git clone git@github.com:meisumsoomro/github-activity.git
cd github-activity
```

## Usage

You can run the script directly using Python:

```bash
python github_activity.py <username> [options]
```

To make it easier to use, you can create an alias:

1. Open your `.bashrc` (or `.zshrc` for zsh users):
```bash
nano ~/.bashrc
```

2. Add an alias for the command:
```bash
alias github-activity="python /path/to/your/script/github_activity.py"
```

3. Save and reload your shell configuration:
```bash
source ~/.bashrc
```

Now you can use:
```bash
github-activity <username> [options]
```

### Available Options:
- `--type TYPE`: Filter by event type
- `--limit N`: Limit number of activities (default: 10)
- `--detailed`: Show detailed information
- `--events`: List available event types
- `--profile`: Show user profile information
- `--repos`: Show repository statistics
- `--contrib`: Show contribution statistics
- `--orgs`: Show organization activity
- `--all`: Show all information (combines all options above)

### Examples:
```bash
# Show basic activity
github-activity meisumsoomro

# Show all information
github-activity meisumsoomro --all

# Show profile information
github-activity meisumsoomro --profile

# Show repository statistics
github-activity meisumsoomro --repos

# Show detailed activity with contributions
github-activity meisumsoomro --detailed --contrib
```

## More on this Project

This project has been created as part of the [Backend Projects](https://roadmap.sh/projects/github-user-activity) from [roadmap.sh](https://roadmap.sh/). You can find more information on how to build this project by visiting the link.