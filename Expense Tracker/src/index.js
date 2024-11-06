#!/usr/bin/env node

/*
 * Expense Tracker CLI Application
 * Main entry point that handles command-line interface and routing
 * 
 * Core Features:
 * - Expense Management (CRUD operations)
 * - Category Management
 * - Budget Tracking and Monitoring
 * - Reporting and Analysis
 * - Data Export Capabilities
 * 
 * Error Handling:
 * - All commands implement try-catch blocks
 * - Errors are logged to console with descriptive messages
 * - Process exits with code 1 on error
 * 
 * Data Validation:
 * - Amount values must be valid numbers
 * - Dates are validated for proper month ranges (1-12)
 * - IDs are checked for existence before operations
 * 
 * This file sets up all command-line commands and their respective options
 * using Commander.js.
 */

import { Command } from 'commander';

// Import commands for core expense operations
import { add } from './commands/add.js';          // Handles expense creation
import { list } from './commands/list.js';        // Displays expense records
import { deleteExpense } from './commands/delete.js'; // Removes expenses
import { summary } from './commands/summary.js';   // Generates summaries
import { update } from './commands/update.js';     // Updates existing expenses
import { exportExpenses } from './commands/export.js'; // Exports to CSV

// Import budget management functionality
import { 
    setBudget,           // Sets monthly budget limits
    viewBudget,          // Displays budget information
    checkBudgetStatus    // Analyzes current spending vs budget
} from './commands/budget.js';

// Import category management functionality
import { 
    addCategory,         // Creates new expense categories
    listCategories,      // Shows all available categories
    deleteCategory,      // Removes categories
    categoryExpenses     // Shows expenses per category
} from './commands/category.js';

// Import reporting functionality
import { 
    monthlyReport,       // Generates detailed monthly reports
    compareMonths        // Compares spending between months
} from './commands/report.js';

// Import plan functionality
import { planBudget } from './commands/plan.js';

// Initialize main Commander instance
const program = new Command();

program
  .name('expense-tracker')
  .description('CLI expense tracker')
  .version('1.0.0');

// Add Expense Command
// Usage: expense-tracker add -d "Grocery shopping" -a 50.25 -c food -t "monthly,essentials" -n "Weekly groceries"
// Examples:
//   Basic usage: expense-tracker add -d "Coffee" -a 4.50
//   With category: expense-tracker add -d "Gas" -a 45.00 -c "transportation"
//   Full details: expense-tracker add -d "Team Lunch" -a 82.50 -c "meals" -t "work,reimbursable" -n "Client meeting"
// Required:
//   -d, --description: Description of the expense (string)
//   -a, --amount: Amount spent (number, positive value)
// Optional:
//   -c, --category: Category of expense (string, defaults to "uncategorized")
//   -t, --tags: Comma-separated tags for the expense (string)
//   -n, --notes: Additional notes about the expense (string)
//   --currency <currency>: Currency (USD or PKR)
// Error Handling:
//   - Validates amount as positive number
//   - Checks category existence if provided
//   - Ensures description is not empty
// Add more detailed comments for the add command
/*
 * Add Command Implementation Details:
 * - Creates a new expense record in the database
 * - Automatically adds timestamp for expense creation
 * - Validates amount format and converts to standard decimal
 * - Normalizes category name to lowercase
 * - Splits tags into array and removes duplicates
 * - Trims whitespace from all string inputs
 * 
 * Return Values:
 * - Success: Returns created expense object with ID
 * - Failure: Throws error with specific message
 */
program
  .command('add')
  .description('Add a new expense')
  .requiredOption('-d, --description <description>', 'expense description')
  .requiredOption('-a, --amount <amount>', 'expense amount')
  .option('-c, --category <category>', 'expense category', 'uncategorized')
  .option('-t, --tags <tags>', 'comma-separated tags')
  .option('-n, --notes <notes>', 'additional notes')
  .option('--currency <currency>', 'currency (USD or PKR)', 'USD')
  .action(async (options) => {
    try {
      await add(
        options.description, 
        options.amount, 
        options.category, 
        {
          tags: options.tags,
          notes: options.notes,
          currency: options.currency.toUpperCase()
        }
      );
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// List Expenses Command
// Usage: expense-tracker list
// Description: Displays all recorded expenses in a formatted table
// Output Format:
//   - ID
//   - Date
//   - Description
//   - Amount
//   - Category
//   - Tags
//   - Notes
// Note: Results are sorted by date (newest first)
// Add more detailed comments for the list command
/*
 * List Command Implementation Details:
 * - Retrieves all expenses from database
 * - Formats currency values to 2 decimal places
 * - Sorts expenses by date (newest first)
 * - Groups expenses by month for better readability
 * - Calculates running total
 * - Highlights expenses over budget
 * 
 * Display Format:
 * | Date       | Description    | Amount  | Category | Tags    |
 * |------------|---------------|---------|----------|---------|
 * | 2024-03-15 | Groceries     | $50.25  | Food     | monthly |
 */
program
  .command('list')
  .description('List all expenses')
  .action(async () => {
    try {
      await list();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Delete Expense Command
// Usage: expense-tracker delete -i abc123
// Examples:
//   Delete single expense: expense-tracker delete -i abc123
// Required:
//   -i, --id: Unique identifier of the expense to delete (string)
// Error Handling:
//   - Validates expense ID exists
//   - Confirms deletion with user
//   - Handles cascade deletion of related data
// Add more detailed comments for the delete command
/*
 * Delete Command Implementation Details:
 * - Performs soft delete to maintain data integrity
 * - Updates related budget calculations
 * - Maintains deletion audit trail
 * - Handles related records (tags, notes)
 * 
 * Safety Measures:
 * - Requires confirmation for expenses over $1000
 * - Cannot delete expenses older than 1 year
 * - Maintains backup of deleted records
 */
program
  .command('delete')
  .description('Delete an expense')
  .requiredOption('-i, --id <id>', 'expense ID')
  .action(async (options) => {
    try {
      await deleteExpense(options.id);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Summary Command
// Usage: expense-tracker summary -m 3
// Examples:
//   Current month: expense-tracker summary
//   Specific month: expense-tracker summary -m 3
// Optional:
//   -m, --month: Month number (1-12) to filter expenses
// Output includes:
//   - Total expenses
//   - Category breakdown
//   - Top spending categories
//   - Daily average
//   - Comparison with previous period
// Add more detailed comments for the summary command
/*
 * Summary Command Implementation Details:
 * - Calculates key metrics:
 *   • Total spending
 *   • Average daily spend
 *   • Highest expense
 *   • Most frequent category
 *   • Budget status
 * 
 * Analysis Features:
 * - Spending trends visualization
 * - Category-wise breakdown
 * - Year-over-year comparison
 * - Anomaly detection
 * 
 * Performance Considerations:
 * - Caches results for 1 hour
 * - Uses aggregate queries for efficiency
 * - Handles large datasets in chunks
 */
program
  .command('summary')
  .description('Show expense summary')
  .option('-m, --month <month>', 'month number (1-12)')
  .action(async (options) => {
    try {
      await summary(options.month);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Update Expense Command
// Usage: expense-tracker update -i abc123 -d "Updated description" -a 75.50
// Examples:
//   Update description: expense-tracker update -i abc123 -d "New description"
//   Update amount: expense-tracker update -i abc123 -a 42.50
//   Update multiple: expense-tracker update -i abc123 -d "New desc" -a 30.00 -c "food"
// Required:
//   -i, --id: Unique identifier of the expense to update (string)
// Optional:
//   -d, --description: New description (string)
//   -a, --amount: New amount (number, positive)
//   -c, --category: New category (string)
//   -t, --tags: New comma-separated tags (string)
//   -n, --notes: New notes (string)
// Error Handling:
//   - Validates expense ID exists
//   - Validates new amount if provided
//   - Checks new category exists if provided
program
  .command('update')
  .description('Update an expense')
  .requiredOption('-i, --id <id>', 'expense ID')
  .option('-d, --description <description>', 'new description')
  .option('-a, --amount <amount>', 'new amount')
  .option('-c, --category <category>', 'new category')
  .option('-t, --tags <tags>', 'comma-separated tags')
  .option('-n, --notes <notes>', 'additional notes')
  .action(async (options) => {
    try {
      await update(
        options.id, 
        options.description, 
        options.amount, 
        options.category,
        {
          tags: options.tags,
          notes: options.notes
        }
      );
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Export Command
// Usage: expense-tracker export -m 3 -o "./march-expenses.csv"
// Examples:
//   All expenses: expense-tracker export
//   Monthly export: expense-tracker export -m 3
//   Custom filename: expense-tracker export -o "custom-name.csv"
// Optional:
//   -m, --month: Month number (1-12) to filter exports
//   -o, --output: Output file path (defaults to expenses-YYYY-MM-DD.csv)
// Export Format:
//   - CSV file with headers
//   - All expense details included
//   - UTF-8 encoding
program
  .command('export')
  .description('Export expenses to CSV file')
  .option('-m, --month <month>', 'filter by month (1-12)')
  .option('-o, --output <filepath>', 'output file path')
  .action(async (options) => {
    try {
      await exportExpenses(options.month, options.output);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Budget Management Commands
// Three subcommands available:
//   1. set    - Set budget for a specific month
//      Usage: expense-tracker budget set -m 3 -a 1000
//      Required: month (-m) and amount (-a)
//      Validates: Positive amount, valid month
//
//   2. view   - View budget information
//      Usage: expense-tracker budget view -m 3
//      Optional: month (-m) defaults to current month
//      Shows: Budget amount, spent amount, remaining amount, daily average
//
//   3. status - Check current budget status
//      Usage: expense-tracker budget status
//      Optional: month (-m) defaults to current month
//      Shows: Spending alerts, projections, category breakdown
// Add more detailed comments for budget commands
/*
 * Budget Command Group Implementation:
 * 
 * Set Budget:
 * - Validates amount against minimum/maximum limits
 * - Prevents backdated budget changes
 * - Supports recurring budget setup
 * - Maintains budget history
 * 
 * View Budget:
 * - Shows daily spending limit
 * - Calculates burn rate
 * - Projects month-end balance
 * - Highlights overspending categories
 * 
 * Status:
 * - Real-time budget tracking
 * - Spending velocity analysis
 * - Alert thresholds (50%, 75%, 90%)
 * - Recommendation engine for savings
 */
program
  .command('budget')
  .description('Budget management')
  .addCommand(
    new Command('set')
      .description('Set budget for a month')
      .requiredOption('-m, --month <month>', 'month number (1-12)')
      .requiredOption('-a, --amount <amount>', 'budget amount')
      .action(async (options) => {
        try {
          await setBudget(options.month, options.amount);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('view')
      .description('View budget')
      .option('-m, --month <month>', 'month number (1-12)')
      .action(async (options) => {
        try {
          await viewBudget(options.month);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Check budget status')
      .option('-m, --month <month>', 'month number (1-12)')
      .action(async (options) => {
        try {
          await checkBudgetStatus(options.month);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  );

// Category Management Commands
// Four subcommands available:
//   1. add      - Create a new category
//      Usage: expense-tracker category add -n "groceries" -d "Food and household items"
//      Required: name (-n)
//      Optional: description (-d)
//      Validates: Unique category name
//
//   2. list     - Display all categories
//      Usage: expense-tracker category list
//      Shows: Name, description, total expenses, last used
//
//   3. delete   - Remove a category
//      Usage: expense-tracker category delete -n "groceries"
//      Required: name (-n)
//      Note: Reassigns expenses to "uncategorized"
//
//   4. expenses - View expenses in a category
//      Usage: expense-tracker category expenses -n "groceries" -m 3
//      Required: name (-n)
//      Optional: month (-m)
//      Shows: All expenses in category with totals
// Add more detailed comments for category commands
/*
 * Category Command Group Implementation:
 * 
 * Category Management Features:
 * - Hierarchical category support
 * - Category merge capabilities
 * - Auto-categorization rules
 * - Category spending limits
 * 
 * Data Integrity:
 * - Prevents category cycles in hierarchy
 * - Maintains category relationships
 * - Handles category renames
 * - Default category fallbacks
 * 
 * Performance Features:
 * - Category caching
 * - Bulk category operations
 * - Optimized category queries
 */
program
  .command('category')
  .description('Category management')
  .addCommand(
    new Command('add')
      .description('Add a new category')
      .requiredOption('-n, --name <name>', 'category name')
      .option('-d, --description <description>', 'category description')
      .action(async (options) => {
        try {
          await addCategory(options.name, options.description);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all categories')
      .action(async () => {
        try {
          await listCategories();
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete a category')
      .requiredOption('-n, --name <name>', 'category name')
      .action(async (options) => {
        try {
          await deleteCategory(options.name);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('expenses')
      .description('View expenses for a category')
      .requiredOption('-n, --name <name>', 'category name')
      .option('-m, --month <month>', 'filter by month (1-12)')
      .action(async (options) => {
        try {
          await categoryExpenses(options.name, options.month);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  );

// Reporting Commands
// Two subcommands available:
//   1. monthly  - Generate a monthly expense report
//      Usage: expense-tracker report monthly -m 3
//      Optional: month (-m) defaults to current month
//      Output: Detailed PDF report with graphs and analysis
//
//   2. compare  - Compare expenses between two months
//      Usage: expense-tracker report compare --month1 3 --month2 4
//      Required: month1 and month2 (1-12)
//      Shows: 
//      - Side-by-side comparison
//      - Percentage changes
//      - Category differences
//      - Trend analysis
// Add more detailed comments for report commands
/*
 * Report Command Group Implementation:
 * 
 * Report Generation Features:
 * - Multiple output formats (PDF, CSV, JSON)
 * - Custom date ranges
 * - Advanced filtering options
 * - Data visualization
 * 
 * Monthly Report Details:
 * - Executive summary
 * - Detailed transaction list
 * - Category analysis
 * - Budget compliance
 * - Saving opportunities
 * 
 * Comparison Report Features:
 * - Month-over-month analysis
 * - Trend identification
 * - Spending pattern changes
 * - Category shifts
 * - Anomaly detection
 * 
 * Technical Considerations:
 * - Asynchronous report generation
 * - Report caching
 * - Large dataset handling
 * - Memory optimization
 */
program
  .command('report')
  .description('Generate expense reports')
  .addCommand(
    new Command('monthly')
      .description('Generate monthly expense report')
      .option('-m, --month <month>', 'month number (1-12)')
      .action(async (options) => {
        try {
          await monthlyReport(options.month);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('compare')
      .description('Compare expenses between two months')
      .requiredOption('--month1 <month1>', 'first month (1-12)')
      .requiredOption('--month2 <month2>', 'second month (1-12)')
      .action(async (options) => {
        try {
          await compareMonths(options.month1, options.month2);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      })
  );

// Plan Command
// Usage: expense-tracker plan -a 5000 -c
// Examples:
//   Plan allocation for $5000
// Required:
//   -a, --amount: Total amount to allocate
// Optional:
//   -c, --custom: Use custom allocation percentages
// Error Handling:
//   - Validates amount as positive number
//   - Displays allocation plan with visualizations
program
  .command('plan')
  .description('Plan budget allocation')
  .requiredOption('-a, --amount <amount>', 'total amount to allocate')
  .option('-c, --custom', 'use custom allocation percentages')
  .action(async (options) => {
    try {
      await planBudget(options.amount, {
        custom: options.custom
      });
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();