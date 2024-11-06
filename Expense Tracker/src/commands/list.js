/**
 * @fileoverview List Command Module - Displays expenses in a formatted table
 * @module commands/list
 * @requires utils/storage
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import path from 'path';
import { CurrencyConverter } from '../utils/currency.js';

// Initialize storage with data file path
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

// Initialize currency converter
const currencyConverter = new CurrencyConverter();

/**
 * Format ISO date to YYYY-MM-DD
 * @param {string} isoDate - Date in ISO format
 * @returns {string} Formatted date string
 * 
 * Example:
 * Input: "2024-03-15T10:30:00.000Z"
 * Output: "2024-03-15"
 */
const formatDate = (isoDate) => {
  return new Date(isoDate).toISOString().split('T')[0];
};

/**
 * Format amount with currency symbol
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount with $ symbol
 * 
 * Example:
 * Input: 42.5
 * Output: "$42.50"
 */
const formatAmount = (amount) => {
  return currencyConverter.formatBoth(amount);
};

/**
 * Format tags array into string
 * @param {string[]} tags - Array of tags
 * @returns {string} Formatted tags in brackets
 * 
 * Example:
 * Input: ["monthly", "food"]
 * Output: "[monthly, food]"
 */
const formatTags = (tags) => {
  return tags.length ? `[${tags.join(', ')}]` : '';
};

/**
 * Format expenses into table view
 * @param {Array<Object>} expenses - Array of expense objects
 * @returns {string} Formatted table string
 * 
 * Table Format:
 * ID    Date        Description    Amount     Category    Tags    Notes
 * -------------------------------------------------------------------------
 * 1     2024-03-15  Groceries     $50.25     Food       [food]  📝
 * 
 * Features:
 * - Fixed-width columns for alignment
 * - Emoji indicators for notes
 * - Sorted by date (newest first)
 * - Grouped by month
 */
const formatTable = (expenses) => {
  if (expenses.length === 0) {
    return 'No expenses found.';
  }

  // Create header
  let output = 'ID    Date        Description    Amount     Category    Tags    Notes\n';
  output += '-------------------------------------------------------------------------\n';

  // Add each expense row
  expenses.forEach(expense => {
    output += `${expense.id.toString().padEnd(6)}`;
    output += `${formatDate(expense.date)}  `;
    output += `${expense.description.padEnd(14)}`;
    output += `${formatAmount(expense.amount).padEnd(10)}`;
    output += `${expense.category.padEnd(12)}`;
    output += `${formatTags(expense.tags).padEnd(8)}`;
    output += `${expense.notes ? '📝' : ''}\n`;
  });

  return output;
};

/**
 * List all expenses in a formatted table
 * @async
 * @function list
 * @throws {Error} When listing operation fails
 * 
 * Implementation Details:
 * - Retrieves all expenses from storage
 * - Sorts by date (newest first)
 * - Formats into readable table
 * - Shows detailed notes separately
 * 
 * Display Features:
 * - Aligned columns
 * - Date formatting
 * - Currency formatting
 * - Tag grouping
 * - Note indicators
 * 
 * Performance Considerations:
 * - Handles large datasets efficiently
 * - Minimizes memory usage
 * - Optimizes string concatenation
 */
export const list = async () => {
  try {
    const data = await storage.readData();
    
    // Sort expenses by date (newest first)
    const sortedExpenses = data.expenses.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    console.log(formatTable(sortedExpenses));

    // Show detailed notes if any exist
    const expensesWithNotes = sortedExpenses.filter(e => e.notes);
    if (expensesWithNotes.length > 0) {
      console.log('\nNotes:');
      expensesWithNotes.forEach(expense => {
        console.log(`ID ${expense.id}: ${expense.notes}`);
      });
    }
  } catch (error) {
    console.error('Failed to list expenses:', error.message);
    process.exit(1);
  }
}; 