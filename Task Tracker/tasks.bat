@echo off
setlocal enabledelayedexpansion

:: ========================================================
:: Task Tracker Batch Script
:: 
:: This batch file provides a simplified interface for the
:: Task Tracker Python application. It enables:
:: - Shorter command syntax
:: - Quick access to common operations
:: - Simplified task management
::
:: Usage: tasks <command> [options]
:: ========================================================

:: Display help menu if no arguments provided
IF "%1"=="" (
    echo Task Tracker Commands:
    echo ------------------
    echo add "title" "description" [priority]  : Add new task        ^| Example: tasks add "Study" "Math homework" P1
    echo list                                 : List all tasks       ^| Example: tasks list
    echo todo                                 : List TODO tasks      ^| Example: tasks todo
    echo prog                                 : List IN_PROGRESS     ^| Example: tasks prog
    echo done                                 : List completed tasks ^| Example: tasks done
    echo p1                                   : High priority tasks  ^| Example: tasks p1
    echo p2                                   : Medium priority      ^| Example: tasks p2
    echo p3                                   : Low priority tasks   ^| Example: tasks p3
    echo update ID [options]                  : Update task         ^| Example: tasks update 1 "New Title"
    echo status ID [status]                   : Change task status  ^| Example: tasks status 1 DONE
    echo del ID                               : Delete task         ^| Example: tasks del 1
    echo help                                 : Show this help      ^| Example: tasks help
    goto :eof
)

:: Command handling section
:: Each IF block handles a specific command type

:: Handle 'add' command - Creates new task
IF "%1"=="add" (
    IF "%~4"=="" (
        :: Add task with default priority (P3)
        python task_tracker.py add "%~2" "%~3"
    ) ELSE (
        :: Add task with specified priority
        python task_tracker.py add "%~2" "%~3" --priority %~4
    )
    goto :eof
)

:: Handle 'list' command - Shows all tasks
IF "%1"=="list" (
    python task_tracker.py list
    goto :eof
)

:: Handle 'todo' command - Shows only TODO tasks
IF "%1"=="todo" (
    python task_tracker.py list --status TODO
    goto :eof
)

:: Handle 'prog' command - Shows in-progress tasks
IF "%1"=="prog" (
    python task_tracker.py list --status IN_PROGRESS
    goto :eof
)

:: Handle 'done' command - Shows completed tasks
IF "%1"=="done" (
    python task_tracker.py list --status DONE
    goto :eof
)

:: Priority filter commands
:: Handle 'p1' command - Shows high priority tasks
IF "%1"=="p1" (
    python task_tracker.py list --priority P1
    goto :eof
)

:: Handle 'p2' command - Shows medium priority tasks
IF "%1"=="p2" (
    python task_tracker.py list --priority P2
    goto :eof
)

:: Handle 'p3' command - Shows low priority tasks
IF "%1"=="p3" (
    python task_tracker.py list --priority P3
    goto :eof
)

:: Handle 'update' command - Updates existing task
:: Supports partial updates (title, description, priority)
IF "%1"=="update" (
    SET cmd=python task_tracker.py update %2
    IF NOT "%~3"=="" SET cmd=!cmd! --title "%~3"        :: Add title if provided
    IF NOT "%~4"=="" SET cmd=!cmd! --description "%~4"  :: Add description if provided
    IF NOT "%~5"=="" SET cmd=!cmd! --priority %~5       :: Add priority if provided
    !cmd!
    goto :eof
)

:: Handle 'status' command - Changes task status
IF "%1"=="status" (
    python task_tracker.py status %2 %3
    goto :eof
)

:: Handle 'del' command - Deletes a task
IF "%1"=="del" (
    python task_tracker.py delete %2
    goto :eof
)

:: Handle 'help' command - Shows detailed help
IF "%1"=="help" (
    python task_tracker.py -h
    goto :eof
)

:: Quick add commands with default priorities
IF "%1"=="quick" (
    :: Quick add with P3 priority
    python task_tracker.py add "%~2" "%~3"
    goto :eof
)

IF "%1"=="urgent" (
    :: Quick add urgent task with P1 priority
    python task_tracker.py add "[URGENT] %~2" "%~3" --priority P1
    goto :eof
)

:: Today's tasks
IF "%1"=="today" (
    echo === TODAY'S TASKS ===
    python task_tracker.py list --status TODO
    echo.
    echo === IN PROGRESS ===
    python task_tracker.py list --status IN_PROGRESS
    goto :eof
)

:: Show all incomplete tasks (TODO + IN_PROGRESS)
IF "%1"=="pending" (
    echo === PENDING TASKS ===
    python task_tracker.py list --status TODO
    echo.
    echo === IN PROGRESS ===
    python task_tracker.py list --status IN_PROGRESS
    goto :eof
)

:: Quick status changes
IF "%1"=="start" (
    :: Quickly mark a task as IN_PROGRESS
    python task_tracker.py status %2 IN_PROGRESS
    goto :eof
)

IF "%1"=="finish" (
    :: Quickly mark a task as DONE
    python task_tracker.py status %2 DONE
    goto :eof
)

:: Priority filters with status
IF "%1"=="p1todo" (
    :: Show high priority TODO tasks
    python task_tracker.py list --priority P1 --status TODO
    goto :eof
)

IF "%1"=="p1prog" (
    :: Show high priority in-progress tasks
    python task_tracker.py list --priority P1 --status IN_PROGRESS
    goto :eof
)

:: Error handling for unknown commands
echo Unknown command: %1
echo Use 'tasks help' for usage information