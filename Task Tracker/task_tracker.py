#!/usr/bin/env python3
"""
Task Tracker - A Command Line Task Management System

This program provides a comprehensive task management solution with features including:
- Task creation, updating, and deletion
- Priority levels (P1, P2, P3)
- Status tracking (TODO, IN_PROGRESS, DONE)
- Persistent JSON storage
- Command-line interface
- Batch and shell script support

File Structure:
- TaskTracker class: Core task management functionality
- Command-line parser: Argument handling
- Main function: Program execution flow

Usage:
    python task_tracker.py <command> [options]
"""

# Step 1: Import required modules for core functionality
import os               # For file operations
import json            # For JSON data handling
import argparse        # For command line argument parsing
from datetime import datetime  # For timestamp creation

# Step 2: Define the main TaskTracker class
class TaskTracker:
    """
    Core task management class that handles all task operations
    
    This class provides methods for:
    - Adding new tasks with priorities
    - Updating existing tasks
    - Changing task status
    - Listing tasks with filters
    - Saving/loading tasks from JSON
    
    Attributes:
        tasks (list): List of task dictionaries
        filename (str): JSON file for persistent storage
    """

    def __init__(self):
        # Initialize with empty task list and JSON filename
        self.tasks = []
        self.filename = "tasks.json"
        self.load_tasks()  # Load existing tasks on initialization

    def load_tasks(self):
        """
        Load tasks from JSON file if it exists
        Creates empty task list if file doesn't exist
        """
        # Load tasks from JSON file if it exists, otherwise start with empty list
        if os.path.exists(self.filename):
            with open(self.filename, 'r') as f:
                self.tasks = json.load(f)

    def save_tasks(self):
        """
        Save current tasks to JSON file
        
        Writes the tasks list to JSON with proper formatting
        Creates the file if it doesn't exist
        """
        # Save current tasks to JSON file with proper formatting
        with open(self.filename, 'w') as f:
            json.dump(self.tasks, f, indent=2)

    def add_task(self, title, description, priority='P3'):
        """
        Add a new task with specified priority
        
        Args:
            title (str): Task title
            description (str): Task description
            priority (str, optional): Task priority (P1=High, P2=Medium, P3=Low)
        """
        # Validate priority before adding task
        valid_priorities = ['P1', 'P2', 'P3']
        if priority not in valid_priorities:
            print(f"Invalid priority! Must be one of: {', '.join(valid_priorities)}")
            return

        # Create new task with current timestamp
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Define task structure with all required fields
        task = {
            'id': len(self.tasks) + 1 if self.tasks else 1,  # Generate unique ID
            'title': title,
            'description': description,
            'priority': priority,
            'status': 'TODO',  # Default status
            'createdAt': current_time,
            'updatedAt': current_time,
            'completedAt': None
        }
        
        # Add task and save to file
        self.tasks.append(task)
        self.save_tasks()
        print(f"Task '{title}' added successfully with {priority} priority!")

    def update_task(self, task_id, title=None, description=None, priority=None):
        # Validate priority if provided
        valid_priorities = ['P1', 'P2', 'P3']
        if priority and priority not in valid_priorities:
            print(f"Invalid priority! Must be one of: {', '.join(valid_priorities)}")
            return

        # Find and update the specified task
        for task in self.tasks:
            if task['id'] == task_id:
                if title: task['title'] = title
                if description: task['description'] = description
                if priority: task['priority'] = priority
                task['updatedAt'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                self.save_tasks()
                print(f"Task #{task_id} updated successfully!")
                return
        print(f"Task #{task_id} not found!")

    def change_status(self, task_id, new_status):
        # Validate status before updating
        valid_statuses = ['TODO', 'IN_PROGRESS', 'DONE']
        if new_status not in valid_statuses:
            print(f"Invalid status! Must be one of: {', '.join(valid_statuses)}")
            return

        # Find and update task status
        for task in self.tasks:
            if task['id'] == task_id:
                task['status'] = new_status
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                task['updatedAt'] = current_time
                # Set completedAt timestamp if task is done
                task['completedAt'] = current_time if new_status == 'DONE' else None
                self.save_tasks()
                print(f"Task #{task_id} status changed to {new_status}!")
                return
        print(f"Task #{task_id} not found!")

    def list_tasks(self, status=None, priority=None):
        # Filter tasks based on status and priority
        filtered_tasks = self.tasks
        if status:
            filtered_tasks = [task for task in filtered_tasks if task['status'] == status]
        if priority:
            filtered_tasks = [task for task in filtered_tasks if task['priority'] == priority]
        
        # Display message if no tasks found
        if not filtered_tasks:
            print("No tasks found!")
            return

        # Print task details in formatted output
        for task in filtered_tasks:
            print(f"\nTask #{task['id']}:")
            print(f"Title: {task['title']}")
            print(f"Description: {task['description']}")
            print(f"Priority: {task['priority']}")
            print(f"Status: {task['status']}")
            print(f"Created: {task['createdAt']}")
            print(f"Last Updated: {task['updatedAt']}")
            if task['completedAt']:
                print(f"Completed: {task['completedAt']}")

# Step 3: Set up command-line argument parsing
def create_parser():
    """
    Create and configure command-line argument parser
    
    Sets up all available commands and their arguments:
    - add: Add new task
    - update: Modify existing task
    - list: Show tasks with optional filters
    - status: Change task status
    
    Returns:
        argparse.ArgumentParser: Configured argument parser
    """
    # Create main parser with description
    parser = argparse.ArgumentParser(description='Task Tracker - Manage your tasks from the command line')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Add task command
    add_parser = subparsers.add_parser('add', help='Add a new task')
    add_parser.add_argument('title', help='Task title')
    add_parser.add_argument('description', help='Task description')
    add_parser.add_argument('--priority', choices=['P1', 'P2', 'P3'], default='P3',
                           help='Task priority (P1=High, P2=Medium, P3=Low)')
    
    # Update task command
    update_parser = subparsers.add_parser('update', help='Update an existing task')
    update_parser.add_argument('id', type=int, help='Task ID')
    update_parser.add_argument('--title', help='New task title')
    update_parser.add_argument('--description', help='New task description')
    update_parser.add_argument('--priority', choices=['P1', 'P2', 'P3'],
                              help='New task priority')
    
    # List tasks command
    list_parser = subparsers.add_parser('list', help='List tasks')
    list_parser.add_argument('--status', choices=['TODO', 'IN_PROGRESS', 'DONE'],
                            help='Filter tasks by status')
    list_parser.add_argument('--priority', choices=['P1', 'P2', 'P3'],
                            help='Filter tasks by priority')
    
    # Change status command
    status_parser = subparsers.add_parser('status', help='Change task status')
    status_parser.add_argument('id', type=int, help='Task ID')
    status_parser.add_argument('new_status', choices=['TODO', 'IN_PROGRESS', 'DONE'],
                              help='New status')
    
    return parser

# Step 4: Main function to handle command execution
def main():
    """
    Main program execution function
    
    Handles:
    1. Command-line argument parsing
    2. TaskTracker initialization
    3. Command execution
    4. Error handling
    """
    # Parse command line arguments
    parser = create_parser()
    args = parser.parse_args()
    
    # Show help if no command provided
    if not args.command:
        parser.print_help()
        return
    
    # Initialize task tracker
    tracker = TaskTracker()
    
    # Execute requested command with error handling
    try:
        if args.command == 'add':
            tracker.add_task(args.title, args.description, args.priority)
        elif args.command == 'update':
            tracker.update_task(args.id, args.title, args.description, args.priority)
        elif args.command == 'list':
            tracker.list_tasks(args.status, args.priority)
        elif args.command == 'status':
            tracker.change_status(args.id, args.new_status)
    except Exception as e:
        print(f"Error: {str(e)}")

# Step 5: Entry point
if __name__ == "__main__":
    main() 