/**
 * @fileoverview Summary Module - Generates expense summaries and analysis
 * @module commands/summary
 * @requires utils/storage
 * @requires utils/errors
 * @requires utils/charts
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import path from 'path';
import { barChart, pieChart } from '../utils/charts.js';
import { CurrencyConverter } from '../utils/currency.js';

// Initialize storage with data file path
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

// Initialize currency converter
const currencyConverter = new CurrencyConverter();

/**
 * Format currency amount with $ symbol and 2 decimal places
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount string
 */
const formatAmount = (amount) => {
  return currencyConverter.formatBoth(amount);
};

/**
 * Generate expense summary
 * @async
 * @param {number|string} [month] - Optional month number (1-12)
 * @throws {ValidationError} When month is invalid
 * 
 * Implementation Details:
 * - Calculates total expenses
 * - Filters by month if specified
 * - Validates month input
 * - Formats output consistently
 * 
 * Analysis Features:
 * - Monthly totals
 * - Category breakdown
 * - Spending trends
 * - Budget comparison
 * 
 * Output Format:
 * - For specific month: "Total expenses for [Month]: $XXX.XX"
 * - For all time: "Total expenses: $XXX.XX"
 */
export const summary = async (month) => {
  try {
    const data = await storage.readData();
    
    if (month) {
      // Validate month input
      const monthNum = Number(month);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new ValidationError('Month must be a number between 1 and 12');
      }

      // Filter expenses for the specified month
      const monthlyExpenses = data.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() + 1 === monthNum;
      });

      const monthlyTotal = monthlyExpenses.reduce((sum, expense) => 
        sum + expense.amount, 0
      );

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      console.log(`Total expenses for ${monthNames[monthNum - 1]}: ${formatAmount(monthlyTotal)}`);

      // Add category breakdown
      const categoryTotals = {};
      monthlyExpenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      });

      console.log('\nCategory Distribution:');
      console.log(pieChart(categoryTotals));
      
      console.log('\nSpending by Category:');
      console.log(barChart(categoryTotals));
    } else {
      // Calculate total expenses
      const total = data.expenses.reduce((sum, expense) => 
        sum + expense.amount, 0
      );

      console.log(`Total expenses: ${formatAmount(total)}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to generate summary:', error.message);
    }
    process.exit(1);
  }
}; 