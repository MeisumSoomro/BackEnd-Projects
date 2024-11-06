/**
 * @fileoverview Advanced Terminal GUI Interface for Expense Tracker
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { Storage } from './utils/storage.js';
import path from 'path';
import { formatDate } from './utils/dateFormatter.js';
import fs from 'fs';

class ExpenseTrackerGUI {
    constructor() {
        // Initialize storage
        this.storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));
        
        // Initialize screen with advanced options
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Advanced Expense Tracker',
            cursor: {
                artificial: true,
                shape: 'line',
                blink: true,
                color: 'white'
            },
            debug: true,
            dockBorders: true,
            fullUnicode: true
        });

        // Initialize components storage
        this.components = {};
        
        // Create main layout
        this.initializeLayout();
        
        // Set up global key handlers
        this.setupKeys();
        
        // Initial render
        this.screen.render();
    }

    initializeLayout() {
        // Create header
        this.components.header = blessed.box({
            parent: this.screen,
            top: 0,
            left: 0,
            width: '100%',
            height: 3,
            tags: true,
            style: {
                fg: 'white',
                bg: 'blue',
                bold: true
            }
        });

        // Add header content with real-time info
        blessed.text({
            parent: this.components.header,
            left: 2,
            content: '{bold}Advanced Expense Tracker{/bold}',
            tags: true
        });

        // Add date/time to header
        this.components.datetime = blessed.text({
            parent: this.components.header,
            right: 2,
            content: new Date().toLocaleString(),
            tags: true
        });

        // Create footer
        this.components.footer = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 3,
            tags: true,
            style: {
                fg: 'white',
                bg: 'blue'
            }
        });

        // Add commands to footer
        blessed.text({
            parent: this.components.footer,
            top: 0,
            left: 0,
            right: 0,
            align: 'center',
            content: '{bold}[a]dd | [l]ist | [s]ummary | [b]udget{/bold}',
            style: {
                fg: 'white'
            }
        });

        blessed.text({
            parent: this.components.footer,
            top: 1,
            left: 0,
            right: 0,
            align: 'center',
            content: '{bold}[u]pdate | [e]xport | [?]help | [q]uit{/bold}',
            style: {
                fg: 'white'
            }
        });

        // Add main content area (empty by default)
        this.components.mainContent = blessed.box({
            parent: this.screen,
            top: 3,
            bottom: 3,
            left: 0,
            right: 0,
            style: {
                fg: 'white'
            }
        });

        // Update time every second
        setInterval(() => {
            this.components.datetime.setContent(new Date().toLocaleString());
            this.screen.render();
        }, 1000);
    }

    setupKeys() {
        // Clear any existing handlers
        this.screen.unkey(['q', 'C-c', '?', 'h', 'a']);
        
        // Quit on q, C-c
        this.screen.key(['q', 'C-c'], () => {
            this.screen.destroy();
            process.exit(0);
        });

        // Help on ?
        this.screen.key(['?', 'h'], () => {
            this.showHelp();
        });

        // Add expense form handler
        this.screen.key(['a'], () => {
            this.showAddExpenseForm();
        });

        // Add list view handler
        this.screen.key(['l'], () => {
            this.showExpenseList();
        });

        // Add summary view handler
        this.screen.key(['s'], () => {
            this.showCategorySummary();
        });

        // Add budget handler
        this.screen.key(['b'], () => {
            this.showBudgetForm();
        });

        // Add update handler
        this.screen.key(['u'], () => {
            this.showUpdateExpenseList();
        });

        // Add export handler
        this.screen.key(['e'], () => {
            this.showExportForm();
        });
    }

    showHelp() {
        const helpContent = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '80%',
            height: '80%',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'blue'
                }
            },
            keys: true,
            vi: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: '█',
                style: {
                    fg: 'blue'
                }
            }
        });

        const content = `
        {bold}Advanced Expense Tracker Help{/bold}

        {bold}Main Commands:{/bold}
        • [a] Add     - Add a new expense
        • [l] List    - View all expenses
        • [s] Summary - View expense summary and charts
        • [b] Budget  - Set and view budgets
        • [u] Update  - Edit or delete expenses
        • [p] Plan    - Financial planning tools
        • [e] Export  - Export data
        • [q] Quit    - Exit application

        {bold}Navigation:{/bold}
        • Tab       - Move between fields
        • Enter     - Select/Confirm
        • Esc       - Cancel/Back
        • ↑/↓       - Navigate lists
        • PgUp/PgDn - Scroll through long content

        {bold}Tips:{/bold}
        • Use categories to better organize expenses
        • Regular backups are automatically created
        • View trends in the Summary section
        • Set budget alerts to track overspending

        Press Esc or q to close this help window
        `;

        helpContent.setContent(content);

        // Close help on escape or q
        helpContent.key(['escape', 'q'], () => {
            helpContent.destroy();
            this.screen.render();
        });

        this.screen.render();
    }

    showMessage(message, type = 'info') {
        const colors = {
            info: 'blue',
            success: 'green',
            error: 'red',
            warning: 'yellow'
        };

        const box = blessed.message({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: 'shrink',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: colors[type],
                border: {
                    fg: colors[type]
                }
            }
        });

        box.display(message, 3);
        this.screen.render();
    }

    showAddExpenseForm() {
        // Clear any existing key handlers
        this.screen.unkey(['enter', 'tab', 'escape']);
        
        const form = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: 20,
            border: {
                type: 'line',
                fg: 'blue'
            },
            tags: true
        });

        // Define closeForm function at the beginning
        const closeForm = () => {
            form.destroy();
            // Restore original key handlers
            this.setupKeys();
            this.screen.render();
        };

        // 1. First define all form elements and labels
        // Category elements
        blessed.text({
            parent: form,
            top: 2,
            left: 2,
            content: 'Category (↑↓ to select):'
        });

        const categoryList = blessed.list({
            parent: form,
            top: 3,
            left: 2,
            width: '90%',
            height: 4,
            items: [
                'Food & Dining',
                'Transportation',
                'Utilities',
                'Housing',
                'Healthcare',
                'Education',
                'Entertainment',
                'Shopping',
                'Travel',
                'Insurance',
                'Savings',
                'Other'
            ],
            border: {
                type: 'line'
            },
            style: {
                selected: {
                    bg: 'blue',
                    fg: 'white'
                },
                focus: {
                    border: {
                        fg: 'blue'
                    }
                }
            },
            keys: true,
            mouse: true
        });

        // Description elements
        blessed.text({
            parent: form,
            top: 8,
            left: 2,
            content: 'Description:'
        });

        const descriptionInput = blessed.textbox({
            parent: form,
            top: 9,
            left: 2,
            width: '90%',
            height: 3,
            mouse: true,
            keys: true,
            inputOnFocus: true,
            border: {
                type: 'line'
            },
            style: {
                focus: {
                    border: {
                        fg: 'blue'
                    }
                }
            }
        });

        // Amount elements
        blessed.text({
            parent: form,
            top: 13,
            left: 2,
            content: 'Amount:'
        });

        const amountInput = blessed.textbox({
            parent: form,
            top: 14,
            left: 2,
            width: '90%',
            height: 3,
            mouse: true,
            keys: true,
            inputOnFocus: true,
            border: {
                type: 'line'
            },
            style: {
                focus: {
                    border: {
                        fg: 'blue'
                    }
                }
            }
        });

        // Submit button
        const submitButton = blessed.button({
            parent: form,
            top: 18,
            left: 'center',
            width: 30,  // Made wider for more text
            height: 1,
            content: 'Press Enter to submit',
            align: 'center',
            style: {
                fg: 'white',
                bg: 'blue',
                focus: {
                    bg: 'dark-blue'
                }
            },
            mouse: false  // Disabled mouse interaction since it's just informative
        });

        // 2. Define submitForm function after all elements exist
        const submitForm = () => {
            const amount = parseFloat(amountInput.getValue());
            const description = descriptionInput.getValue().trim();
            const selectedCategory = categoryList.getItem(categoryList.selected)?.content;

            // Validate all fields
            if (!selectedCategory) {
                this.showMessage('Please select a category', 'error');
                categoryList.focus();
                return;
            }

            if (!description) {
                this.showMessage('Please enter a description', 'error');
                descriptionInput.focus();
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                this.showMessage('Please enter a valid amount', 'error');
                amountInput.focus();
                return;
            }

            // Create expense object
            const expense = {
                amount,
                description,
                category: selectedCategory,
                date: new Date().toISOString()
            };

            try {
                // Send to storage
                this.storage.addExpense(expense);
                this.showMessage('Expense added successfully!', 'success');
                closeForm();
            } catch (error) {
                this.showMessage(`Error: ${error.message}`, 'error');
            }
        };

        // 3. Add all event handlers after elements and functions are defined
        // Category list handlers
        categoryList.on('keypress', function(ch, key) {
            if (key.name === 'enter') {
                descriptionInput.focus();
                descriptionInput.readInput();  // Ensure input mode is active
                return false;
            }
            if (key.name === 'tab') {
                descriptionInput.focus();
                return false;
            }
            return true;
        });

        // Description input handlers
        descriptionInput.on('keypress', function(ch, key) {
            if (key.name === 'enter') {
                const description = this.getValue().trim();
                if (description) {
                    this.style.bg = 'gray';
                    this.readOnly = true;
                    
                    // Force amount input activation
                    setTimeout(() => {
                        amountInput.focus();
                        amountInput.setValue('');
                        amountInput.setIndex(0);
                        amountInput.readInput();
                        this.screen.render();
                    }, 0);
                    
                    return false;
                }
                return false;
            }
            
            if (this.readOnly) {
                return false;
            }

            return true;
        });

        // Amount input handlers
        amountInput.on('keypress', (ch, key) => {
            if (key.name === 'enter') {
                const value = amountInput.getValue();
                const amount = parseFloat(value);
                
                if (!isNaN(amount) && amount > 0) {
                    amountInput.style.bg = 'gray';
                    submitForm();  // Call submitForm directly
                    return false;
                }
                return false;
            }

            // For character input, only allow numbers and one decimal point
            if (ch) {
                // Block all non-numeric and non-decimal input immediately
                if (!/[0-9.]/.test(ch)) {
                    return false;
                }

                // Handle decimal point
                if (ch === '.') {
                    const currentValue = amountInput.getValue();
                    if (currentValue.includes('.')) {
                        return false;  // Block additional decimal points
                    }
                }

                return true;  // Allow valid numbers and first decimal
            }

            // Allow only specific control keys
            if (key.name) {
                return ['backspace', 'left', 'right', 'delete'].includes(key.name);
            }

            return false;  // Block all other input
        });

        amountInput.on('focus', function() {
            setTimeout(() => {
                this.readInput();
                this.setIndex(this.getValue().length);
                this.screen.render();
            }, 0);
        });

        // Submit button handlers
        submitButton.on('press', submitForm);
        submitButton.key('enter', submitForm);

        // Form key handlers
        form.key('escape', closeForm);
        form.key('tab', () => {
            const focused = this.screen.focused;
            if (focused === categoryList) descriptionInput.focus();
            else if (focused === descriptionInput) amountInput.focus();
            else if (focused === amountInput || focused === submitButton) categoryList.focus();
        });

        // Add escape handlers
        categoryList.key('escape', closeForm);
        descriptionInput.key('escape', closeForm);
        amountInput.key('escape', closeForm);

        // Set initial focus
        categoryList.focus();
        this.screen.render();
    }

    showExpenseList() {
        // Clear main content and store reference to original content
        const originalContent = this.components.mainContent.getContent();
        this.components.mainContent.setContent('');

        // Create table with better alignment
        const table = blessed.listtable({
            parent: this.components.mainContent,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%-2',
            border: {
                type: 'line'
            },
            style: {
                header: {
                    fg: 'blue',
                    bold: true
                },
                cell: {
                    fg: 'white'
                }
            },
            align: 'left',
            pad: 1,
            keys: true,
            vi: true,
            mouse: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: '█',
                style: {
                    fg: 'blue'
                }
            },
            noCellBorders: true,
            // Add fixed column widths
            columnWidth: [20, 15, 30, 15]  // Adjust these numbers as needed
        });

        // Get expenses from storage
        const expenses = this.storage.getExpenses();

        // Format data for table with padding for alignment
        const headers = ['Date', 'Category', 'Description', 'Amount'];
        const rows = [headers];

        expenses.forEach(expense => {
            // Ensure each field has proper padding and truncation
            const date = formatDate(expense.date).padEnd(18);
            const category = (expense.category || '').padEnd(13);
            const description = (expense.description || '').length > 28 
                ? (expense.description || '').substring(0, 25) + '...' 
                : (expense.description || '').padEnd(28);
            const amount = `$${expense.amount.toFixed(2)}`.padStart(12);

            rows.push([date, category, description, amount]);
        });

        // Set table data
        table.setData(rows);

        // Define closeList function with proper cleanup
        const closeList = () => {
            // Remove the table and instructions
            table.detach();
            
            // Restore original content
            this.components.mainContent.setContent('🎉 Welcome to Advanced Expense Tracker!\nPress ? for help or use the commands below.');
            
            // Restore original key handlers
            this.setupKeys();
            
            // Force screen update
            this.screen.render();
        };

        // Handle escape key properly
        this.screen.key('escape', () => {
            closeList();
        });

        // Add escape handler to the table
        table.key('escape', () => {
            closeList();
        });

        // Update instructions text
        blessed.text({
            parent: this.components.mainContent,
            bottom: 0,
            left: 'center',
            content: '↑/↓: Navigate | Enter: View Details | Esc: Back to Menu',
            style: {
                fg: 'blue',
                bold: true
            }
        });

        // Improve navigation handling
        table.key(['up', 'down'], (ch, key) => {
            const currentIndex = table.selected;
            if (key.name === 'up' && currentIndex > 0) {
                table.up();
            } else if (key.name === 'down' && currentIndex < rows.length - 1) {
                table.down();
            }
            this.screen.render();
        });

        // Handle selection
        table.on('select', (item, index) => {
            if (index === 0) return; // Skip header row
            const expense = expenses[index - 1];
            // We'll implement showExpenseDetails later
            // this.showExpenseDetails(expense);
        });

        // Focus table and render
        table.focus();
        this.screen.render();
    }

    showCategorySummary() {
        // Clear main content
        this.components.mainContent.setContent('');

        // Create base container
        const container = blessed.box({
            parent: this.screen,
            top: 3,
            bottom: 3,
            left: 0,
            right: 0,
            border: {
                type: 'line',
                fg: 'blue'
            }
        });

        // Top Left - Category Distribution
        const topLeft = blessed.box({
            parent: container,
            top: 0,
            left: 0,
            width: '50%',
            height: '50%',
            border: {
                type: 'line'
            },
            label: ' Category Distribution ',
            content: 'Category breakdown will go here',
            style: {
                border: {
                    fg: 'green'
                }
            }
        });

        // Top Right - Monthly Trends
        const topRight = blessed.box({
            parent: container,
            top: 0,
            left: '50%',
            width: '50%',
            height: '50%',
            border: {
                type: 'line'
            },
            label: ' Monthly Trends ',
            content: 'Monthly spending trends will go here',
            style: {
                border: {
                    fg: 'yellow'
                }
            }
        });

        // Bottom Left - Budget Progress
        const bottomLeft = blessed.box({
            parent: container,
            top: '50%',
            left: 0,
            width: '50%',
            height: '50%',
            border: {
                type: 'line'
            },
            label: ' Budget Progress ',
            content: 'Budget tracking will go here',
            style: {
                border: {
                    fg: 'magenta'
                }
            }
        });

        // Bottom Right - Recent Transactions
        const bottomRight = blessed.box({
            parent: container,
            top: '50%',
            left: '50%',
            width: '50%',
            height: '50%',
            border: {
                type: 'line'
            },
            label: ' Recent Transactions ',
            content: 'Recent transactions will go here',
            style: {
                border: {
                    fg: 'cyan'
                }
            }
        });

        // Handle escape
        const closeSummary = () => {
            container.destroy();
            this.components.mainContent.setContent('');
            this.setupKeys();
            this.screen.render();
        };

        this.screen.key(['escape', 'q'], closeSummary);
        this.screen.render();
    }

    showBudgetForm() {
        // Clear main content
        this.components.mainContent.setContent('');

        const form = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '80%',
            border: {
                type: 'line',
                fg: 'blue'
            },
            tags: true
        });

        // Title
        blessed.text({
            parent: form,
            top: 0,
            left: 'center',
            content: '{bold}Budget Settings{/bold}',
            tags: true
        });

        // Get current budgets
        const budgets = this.storage.loadData().budgets || {};

        // Create list of categories with current budgets
        const categories = [
            'Food & Dining',
            'Transportation',
            'Utilities',
            'Housing',
            'Healthcare',
            'Education',
            'Entertainment',
            'Shopping',
            'Travel',
            'Insurance',
            'Savings',
            'Other'
        ];

        // Create list
        const list = blessed.list({
            parent: form,
            top: 2,
            left: 2,
            width: '96%',
            height: '50%',
            keys: true,
            vi: true,
            mouse: true,
            border: {
                type: 'line'
            },
            style: {
                selected: {
                    bg: 'blue',
                    fg: 'white'
                },
                focus: {
                    border: {
                        fg: 'blue'
                    }
                }
            },
            items: categories.map(cat => {
                const budget = budgets[cat] || 0;
                return `${cat.padEnd(20)} Budget: $${budget.toFixed(2)}`;
            })
        });

        // Input box for new budget
        const input = blessed.textbox({
            parent: form,
            top: '55%',
            left: 'center',
            width: '50%',
            height: 3,
            inputOnFocus: true,
            border: {
                type: 'line'
            },
            style: {
                focus: {
                    border: {
                        fg: 'blue'
                    }
                }
            }
        });

        // Instructions
        blessed.text({
            parent: form,
            top: '65%',
            left: 'center',
            content: 'Select category and enter new budget amount\nEnter numbers only',
            align: 'center'
        });

        // Status message
        const status = blessed.text({
            parent: form,
            bottom: 3,
            left: 'center',
            content: '',
            align: 'center',
            tags: true
        });

        // Handle input
        input.on('keypress', (ch, key) => {
            if (key.name === 'enter') {
                const value = parseFloat(input.getValue());
                if (!isNaN(value) && value >= 0) {
                    const selectedCategory = categories[list.selected];
                    
                    // Update budget in storage
                    const data = this.storage.loadData();
                    data.budgets = data.budgets || {};
                    data.budgets[selectedCategory] = value;
                    this.storage.saveData(data);

                    // Update list
                    list.setItems(categories.map(cat => {
                        const budget = data.budgets[cat] || 0;
                        return `${cat.padEnd(20)} Budget: $${budget.toFixed(2)}`;
                    }));

                    status.setContent('{green-fg}Budget updated successfully!{/green-fg}');
                    input.setValue('');
                    this.screen.render();
                } else {
                    status.setContent('{red-fg}Please enter a valid amount{/red-fg}');
                    this.screen.render();
                }
            }
            // Only allow numbers and decimal point
            if (ch && !/[0-9.]/.test(ch)) {
                return false;
            }
        });

        // Close form handler
        const closeForm = () => {
            form.destroy();
            this.components.mainContent.setContent('🎉 Welcome to Advanced Expense Tracker!\nPress ? for help or use the commands below.');
            this.setupKeys();
            this.screen.render();
        };

        // Add escape handlers
        form.key('escape', closeForm);
        list.key('escape', closeForm);
        input.key('escape', closeForm);

        // Navigation
        list.on('select', () => {
            input.focus();
            input.setValue('');
            this.screen.render();
        });

        // Focus handling
        list.focus();
        this.screen.render();
    }

    showUpdateExpenseList() {
        // Clear main content
        this.components.mainContent.setContent('');

        const container = blessed.box({
            parent: this.components.mainContent,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: {
                type: 'line'
            }
        });

        // Get expenses from storage
        const expenses = this.storage.getExpenses();

        // Create list of expenses
        const list = blessed.list({
            parent: container,
            top: 1,
            left: 1,
            width: '98%',
            height: '90%',
            keys: true,
            vi: true,
            mouse: true,
            border: {
                type: 'line'
            },
            style: {
                selected: {
                    bg: 'blue',
                    fg: 'white'
                },
                focus: {
                    border: {
                        fg: 'blue'
                    }
                }
            },
            items: expenses.map(expense => 
                `${formatDate(expense.date)} | ${expense.category.padEnd(15)} | ${expense.description.padEnd(20)} | $${expense.amount.toFixed(2)}`
            )
        });

        // Instructions
        blessed.text({
            parent: container,
            bottom: 0,
            left: 'center',
            content: 'Enter: Edit | D: Delete | Esc: Back',
            style: {
                fg: 'blue',
                bold: true
            }
        });

        // Handle edit
        const editExpense = (expense) => {
            // Create edit form
            const editForm = blessed.form({
                parent: this.screen,
                top: 'center',
                left: 'center',
                width: 60,
                height: 20,
                border: {
                    type: 'line'
                },
                keys: true
            });

            // Category label with navigation hint
            blessed.text({
                parent: editForm,
                top: 1,
                left: 2,
                content: 'Category (Use ↑↓ arrows to select):',
                style: {
                    fg: 'blue'
                }
            });

            // Add visual arrows for navigation
            blessed.text({
                parent: editForm,
                top: 2,
                left: '95%',
                content: '↑',
                style: {
                    fg: 'blue',
                    bold: true
                }
            });

            blessed.text({
                parent: editForm,
                top: 4,
                left: '95%',
                content: '↓',
                style: {
                    fg: 'blue',
                    bold: true
                }
            });

            const categoryList = blessed.list({
                parent: editForm,
                top: 2,
                left: 2,
                width: '90%',
                height: 3,  // Show 3 items at a time
                items: [
                    'Food & Dining',
                    'Transportation',
                    'Utilities',
                    'Housing',
                    'Healthcare',
                    'Education',
                    'Entertainment',
                    'Shopping',
                    'Travel',
                    'Insurance',
                    'Savings',
                    'Other'
                ],
                border: {
                    type: 'line'
                },
                style: {
                    selected: {
                        bg: 'blue',
                        fg: 'white'
                    },
                    focus: {
                        border: {
                            fg: 'blue'
                        }
                    }
                },
                scrollable: true,  // Enable scrolling
                alwaysScroll: true,
                keys: true,
                vi: true,
                mouse: true,
                value: expense.category  // Set current category as selected
            });

            // Description input
            blessed.text({
                parent: editForm,
                top: 5,
                left: 2,
                content: 'Description:'
            });

            const descriptionInput = blessed.textbox({
                parent: editForm,
                top: 6,
                left: 2,
                width: '90%',
                height: 3,
                value: expense.description,
                inputOnFocus: true,
                border: {
                    type: 'line'
                },
                style: {
                    focus: {
                        border: {
                            fg: 'blue'
                        }
                    }
                }
            });

            // Amount input
            blessed.text({
                parent: editForm,
                top: 9,
                left: 2,
                content: 'Amount:'
            });

            const amountInput = blessed.textbox({
                parent: editForm,
                top: 10,
                left: 2,
                width: '90%',
                height: 3,
                value: expense.amount.toString(),
                inputOnFocus: true,
                border: {
                    type: 'line'
                },
                style: {
                    focus: {
                        border: {
                            fg: 'blue'
                        }
                    }
                }
            });

            // Instructions
            blessed.text({
                parent: editForm,
                bottom: 1,
                left: 'center',
                content: 'Tab: Next Field | Enter: Save Changes | Esc: Cancel',
                style: {
                    fg: 'blue'
                }
            });

            // Track locked states
            let categoryLocked = false;
            let descriptionLocked = false;
            let amountLocked = false;

            // Navigation and input handlers
            categoryList.on('keypress', function(ch, key) {
                if (key.name === 'tab') {
                    categoryLocked = true;
                    descriptionInput.focus();
                    descriptionInput.readInput();
                    descriptionLocked = false;  // Unlock the field we're moving to
                    return false;
                }
                return !categoryLocked;  // Only allow input if not locked
            });

            descriptionInput.on('focus', function() {
                if (!descriptionLocked) {
                this.readInput();
                this.screen.render();
                }
            });

            descriptionInput.on('keypress', function(ch, key) {
                if (descriptionLocked) return false;  // Block input if locked

                if (key.name === 'tab') {
                    descriptionLocked = true;
                amountInput.focus();
                    amountInput.readInput();
                    amountLocked = false;  // Unlock the field we're moving to
                    return false;
                }
                return true;
            });

            amountInput.on('focus', function() {
                if (!amountLocked) {
                this.readInput();
                this.screen.render();
                }
            });

            amountInput.on('keypress', function(ch, key) {
                if (amountLocked) return false;  // Block input if locked

                if (key.name === 'tab') {
                    amountLocked = true;
                    categoryList.focus();
                    categoryLocked = false;  // Unlock the field we're moving to
                    return false;
                }

                // Number validation
                if (ch) {
                    if (!/[0-9.]/.test(ch)) return false;
                    if (ch === '.' && this.getValue().includes('.')) return false;
                }
                return true;
            });

            // Add visual feedback for locked state
            const updateLockedStyles = () => {
                if (categoryLocked) categoryList.style.bg = 'gray';
                if (descriptionLocked) descriptionInput.style.bg = 'gray';
                if (amountLocked) amountInput.style.bg = 'gray';
                editForm.screen.render();
            };

            // Reset locks when form closes
            editForm.key('escape', () => {
                categoryLocked = false;
                descriptionLocked = false;
                amountLocked = false;
                editForm.destroy();
                this.screen.render();
            });

            // Form submission handler
            editForm.key('enter', () => {
                const updatedExpense = {
                    ...expense,
                    category: categoryList.getItem(categoryList.selected).content,
                    description: descriptionInput.getValue().trim(),
                    amount: parseFloat(amountInput.getValue())
                };

                // Validate
                if (!updatedExpense.category || !updatedExpense.description || isNaN(updatedExpense.amount)) {
                    this.showMessage('Please fill all fields correctly', 'error');
                    return;
                }

                try {
                    // Update expense
                    this.storage.updateExpense(expense.id, updatedExpense);
                    this.showMessage('Expense updated successfully!', 'success');
                    editForm.destroy();
                    // Refresh the list
                    list.setItems(this.storage.getExpenses().map(exp => 
                        `${formatDate(exp.date)} | ${exp.category.padEnd(15)} | ${exp.description.padEnd(20)} | $${exp.amount.toFixed(2)}`
                    ));
                    this.screen.render();
                } catch (error) {
                    this.showMessage(`Error: ${error.message}`, 'error');
                }
            });

            // Handle escape
            editForm.key('escape', () => {
                editForm.destroy();
                this.screen.render();
            });

            // Number validation for amount input
            amountInput.on('keypress', (ch, key) => {
                if (!ch || key.name === 'enter' || key.name === 'tab') return true;
                if (!/[0-9.]/.test(ch)) return false;
                if (ch === '.' && amountInput.getValue().includes('.')) return false;
                return true;
            });

            // Set initial focus
            categoryList.focus();
        };

        // Handle delete
        const deleteExpense = (expense) => {
            try {
                this.storage.deleteExpense(expense.id);
                this.showMessage('Expense deleted successfully!', 'success');
                // Refresh the list by updating items
                list.setItems(this.storage.getExpenses().map(exp => 
                    `${formatDate(exp.date)} | ${exp.category.padEnd(15)} | ${exp.description.padEnd(20)} | $${exp.amount.toFixed(2)}`
                ));
                this.screen.render();
            } catch (error) {
                this.showMessage(`Error: ${error.message}`, 'error');
            }
        };

        // List key handlers
        list.key(['enter'], () => {
            const expense = expenses[list.selected];
            if (expense) {
                // Create options menu
                const optionsMenu = blessed.list({
                    parent: this.screen,
                    top: 'center',
                    left: 'center',
                    width: 30,
                    height: 8,
                    border: {
                        type: 'line'
                    },
                    items: [
                        'Edit Expense',
                        'Delete Expense',
                        'Cancel'
                    ],
                    style: {
                        selected: {
                            bg: 'blue',
                            fg: 'white'
                        },
                        border: {
                            fg: 'blue'
                        }
                    },
                    keys: true,
                    vi: true,
                    mouse: true
                });

                // Handle option selection
                optionsMenu.on('select', (item, index) => {
                    switch(index) {
                        case 0: // Edit
                            optionsMenu.destroy();
                            editExpense(expense);
                            break;
                        case 1: // Delete
                            optionsMenu.destroy();
                deleteExpense(expense);
                            break;
                        case 2: // Cancel
                            optionsMenu.destroy();
                            this.screen.render();
                            break;
                    }
                });

                // Handle escape
                optionsMenu.key('escape', () => {
                    optionsMenu.destroy();
                    this.screen.render();
                });

                optionsMenu.focus();
                this.screen.render();
            }
        });

        // Handle escape
        const closeList = () => {
            container.destroy();
            this.components.mainContent.setContent('🎉 Welcome to Advanced Expense Tracker!\nPress ? for help or use the commands below.');
            this.setupKeys();
            this.screen.render();
        };

        container.key('escape', closeList);
        this.screen.key('escape', closeList);

        // Focus list
        list.focus();
        this.screen.render();
    }

    // Add this method to ExpenseTrackerGUI class
    preventDuplicateKeys(element) {
        // Remove any existing keypress listeners
        element.removeAllListeners('keypress');
        element.removeAllListeners('key');
    }

    // Add new method for CSV export
    showExportForm() {
        const form = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: 60,
            height: 12,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'blue'
                }
            }
        });

        // Title
        blessed.text({
            parent: form,
            top: 1,
            left: 'center',
            content: '{bold}Export Expenses{/bold}',
            tags: true
        });

        // Default filename
        const defaultFilename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;

        // Filename input
        blessed.text({
            parent: form,
            top: 3,
            left: 2,
            content: 'Filename:'
        });

        const filenameInput = blessed.textbox({
            parent: form,
            top: 4,
            left: 2,
            width: '90%',
            height: 3,
            inputOnFocus: true,
            value: defaultFilename,
            border: {
                type: 'line'
            }
        });

        // Instructions
        blessed.text({
            parent: form,
            bottom: 1,
            left: 'center',
            content: 'Enter: Export | Esc: Cancel',
            style: {
                fg: 'gray'
            }
        });

        // Define closeForm function
        const closeForm = () => {
            form.destroy();
            this.components.mainContent.setContent('🎉 Welcome to Advanced Expense Tracker!\nPress ? for help or use the commands below.');
            this.setupKeys();
            this.screen.render();
        };

        // Export function
        const exportToCSV = () => {
            try {
                const expenses = this.storage.getExpenses();
                const filename = filenameInput.getValue().trim() || defaultFilename;

                // Create CSV content
                const headers = ['Date', 'Category', 'Description', 'Amount'];
                const rows = expenses.map(expense => [
                    formatDate(expense.date),
                    expense.category,
                    expense.description,
                    expense.amount.toFixed(2)
                ]);

                // Combine headers and rows
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');

                // Write to file
                try {
                    fs.writeFileSync(filename, csvContent, 'utf8');
                this.showMessage(`Expenses exported to ${filename}`, 'success');
                    closeForm();
                } catch (error) {
                    this.showMessage(`Failed to write file: ${error.message}`, 'error');
                }
            } catch (error) {
                this.showMessage(`Export failed: ${error.message}`, 'error');
            }
        };

        // Handle input
        filenameInput.on('keypress', function(ch, key) {
            if (key.name === 'enter') {
                exportToCSV();
                return false;
            }
            if (key.name === 'escape') {
                closeForm();
                return false;
            }
            return true;
        });

        // Handle escape at form level
        form.key(['escape'], closeForm);

        // Focus filename input and start input mode
        filenameInput.focus();
        filenameInput.readInput();
        this.screen.render();
    }
}

// Start the GUI
const gui = new ExpenseTrackerGUI(); 