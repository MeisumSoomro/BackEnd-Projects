#!/bin/bash

# ========================================================
# Task Tracker Shell Script
# 
# This shell script provides a Unix/Linux interface for the
# Task Tracker Python application. Features:
# - Simplified command syntax
# - Easy access to task management
# - Support for all task operations
#
# Usage: ./tasks.sh <command> [options]
# ========================================================

# Show help if no arguments provided
if [ $# -eq 0 ]; then
    echo "Task Tracker Commands:"
    echo "------------------"
    echo "Basic Commands:"
    echo "add \"title\" \"description\" [priority] : Add new task        | Example: ./tasks.sh add \"Study\" \"Math homework\" P1"
    echo "list                                   : List all tasks       | Example: ./tasks.sh list"
    echo "todo                                   : List TODO tasks      | Example: ./tasks.sh todo"
    echo "prog                                   : List IN_PROGRESS     | Example: ./tasks.sh prog"
    echo "done                                   : List completed tasks | Example: ./tasks.sh done"
    echo
    echo "Quick Commands:"
    echo "quick \"title\" \"description\"          : Quick add (P3)      | Example: ./tasks.sh quick \"Read\" \"Check emails\""
    echo "urgent \"title\" \"description\"         : Urgent add (P1)     | Example: ./tasks.sh urgent \"Meeting\" \"Client call\""
    echo "today                                  : Show today's tasks   | Example: ./tasks.sh today"
    echo "pending                                : Show pending tasks   | Example: ./tasks.sh pending"
    echo "start ID                               : Start task          | Example: ./tasks.sh start 1"
    echo "finish ID                              : Complete task       | Example: ./tasks.sh finish 1"
    echo
    echo "Priority Commands:"
    echo "p1                                     : High priority tasks | Example: ./tasks.sh p1"
    echo "p2                                     : Medium priority     | Example: ./tasks.sh p2"
    echo "p3                                     : Low priority tasks  | Example: ./tasks.sh p3"
    echo "p1todo                                 : High priority TODO  | Example: ./tasks.sh p1todo"
    echo "p1prog                                 : High priority PROG  | Example: ./tasks.sh p1prog"
    exit 0
fi

# Command handling section
case "$1" in
    # Original commands
    "add")
        if [ -n "$4" ]; then
            python task_tracker.py add "$2" "$3" --priority "$4"
        else
            python task_tracker.py add "$2" "$3"
        fi
        ;;
    
    # Quick commands
    "quick")
        python task_tracker.py add "$2" "$3"  # Default P3 priority
        ;;
    
    "urgent")
        python task_tracker.py add "[URGENT] $2" "$3" --priority P1
        ;;
    
    # Overview commands
    "today")
        echo "=== TODAY'S TASKS ==="
        python task_tracker.py list --status TODO
        echo
        echo "=== IN PROGRESS ==="
        python task_tracker.py list --status IN_PROGRESS
        ;;
    
    "pending")
        echo "=== PENDING TASKS ==="
        python task_tracker.py list --status TODO
        echo
        echo "=== IN PROGRESS ==="
        python task_tracker.py list --status IN_PROGRESS
        ;;
    
    # Quick status changes
    "start")
        python task_tracker.py status "$2" IN_PROGRESS
        ;;
    
    "finish")
        python task_tracker.py status "$2" DONE
        ;;
    
    # Priority with status filters
    "p1todo")
        python task_tracker.py list --priority P1 --status TODO
        ;;
    
    "p1prog")
        python task_tracker.py list --priority P1 --status IN_PROGRESS
        ;;
    
    # Original commands continued...
    "list")
        python task_tracker.py list
        ;;
    
    "todo")
        python task_tracker.py list --status TODO
        ;;
    
    "prog")
        python task_tracker.py list --status IN_PROGRESS
        ;;
    
    "done")
        python task_tracker.py list --status DONE
        ;;
    
    "p1")
        python task_tracker.py list --priority P1
        ;;
    
    "p2")
        python task_tracker.py list --priority P2
        ;;
    
    "p3")
        python task_tracker.py list --priority P3
        ;;
    
    "update")
        cmd="python task_tracker.py update $2"
        if [ -n "$3" ]; then cmd="$cmd --title \"$3\""; fi
        if [ -n "$4" ]; then cmd="$cmd --description \"$4\""; fi
        if [ -n "$5" ]; then cmd="$cmd --priority $5"; fi
        eval $cmd
        ;;
    
    "status")
        python task_tracker.py status "$2" "$3"
        ;;
    
    "del")
        python task_tracker.py delete "$2"
        ;;
    
    "help")
        python task_tracker.py -h
        ;;
    
    *)
        echo "Unknown command: $1"
        echo "Use './tasks.sh help' for usage information"
        exit 1
        ;;
esac 