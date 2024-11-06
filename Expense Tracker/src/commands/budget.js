/**
 * @fileoverview Budget Management Module - Handles all budget-related operations
 * @module commands/budget
 * @requires utils/storage
 * @requires utils/errors
 * @requires utils/charts
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import path from 'path';
import { progressCircle, barChart, sparkline } from '../utils/charts.js';
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
 * Set budget for a specific month
 * @async
 * @param {number|string} month - Month number (1-12)
 * @param {number|string} amount - Budget amount to set
 * @throws {ValidationError} When month or amount is invalid
 * 
 * Implementation Details:
 * - Validates month range (1-12)
 * - Ensures positive budget amount
 * - Creates budget structure if not exists
 * - Updates existing budget if already set
 */
export const setBudget = async (month, amount) => {
  try {
    const monthNum = Number(month);
    const budgetAmount = Number(amount);
    
    // Validate inputs
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new ValidationError('Month must be a number between 1 and 12');
    }
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      throw new ValidationError('Budget amount must be a positive number');
    }

    const data = await storage.readData();
    const year = new Date().getFullYear();

    // Initialize budgets if not exists
    if (!data.budgets) {
      data.budgets = {};
    }
    if (!data.budgets[year]) {
      data.budgets[year] = {};
    }

    // Set budget for month
    data.budgets[year][month] = budgetAmount;
    await storage.writeData(data);

    console.log(`Budget set for month ${month}: ${formatAmount(budgetAmount)}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to set budget:', error.message);
    }
    process.exit(1);
  }
};

/**
 * View budget information for specified month or all months
 * @async
 * @param {number|string} [month] - Optional month number (1-12)
 * @throws {ValidationError} When month is invalid
 * 
 * Display Format:
 * - Shows budget amount per month
 * - Indicates months with no budget set
 * - Formats all amounts consistently
 */
export const viewBudget = async (month) => {
  try {
    const data = await storage.readData();
    const year = new Date().getFullYear();

    if (!data.budgets?.[year]) {
      console.log('No budgets set for current year');
      return;
    }

    if (month) {
      const monthNum = Number(month);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new ValidationError('Month must be a number between 1 and 12');
      }

      const budget = data.budgets[year][month] || 0;
      console.log(`Budget for month ${month}: ${formatAmount(budget)}`);
    } else {
      // Show all months
      console.log('Current year budgets:');
      for (let m = 1; m <= 12; m++) {
        const budget = data.budgets[year][m] || 0;
        if (budget > 0) {
          console.log(`Month ${m}: ${formatAmount(budget)}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to view budget:', error.message);
    process.exit(1);
  }
};

/**
 * Check current budget status and spending
 * @async
 * @param {number|string} [month] - Optional month number (1-12)
 * @throws {ValidationError} When month is invalid
 * 
 * Analysis Features:
 * - Calculates total spent vs budget
 * - Shows remaining budget
 * - Displays percentage used
 * - Provides warnings at 80% and 100% thresholds
 * 
 * Output Format:
 * Budget Status for Month X:
 * - Budget: $X,XXX.XX
 * - Spent: $X,XXX.XX
 * - Remaining: $X,XXX.XX
 * - Used: XX.X%
 */
export const checkBudgetStatus = async (month) => {
  try {
    const data = await storage.readData();
    const year = new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const budget = data.budgets?.[year]?.[currentMonth] || 0;
    if (budget === 0) {
      console.log(`No budget set for month ${currentMonth}`);
      return;
    }

    // Calculate total expenses for the month
    const monthlyExpenses = data.expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() + 1 === currentMonth &&
             expenseDate.getFullYear() === year;
    });

    const totalSpent = monthlyExpenses.reduce((sum, expense) => 
      sum + expense.amount, 0
    );

    const remaining = budget - totalSpent;
    const percentageUsed = (totalSpent / budget) * 100;

    console.log(`Budget Status for Month ${currentMonth}:`);
    console.log(progressCircle(percentageUsed));
    console.log(`\nBudget: ${formatAmount(budget)}`);
    console.log(`Spent: ${formatAmount(totalSpent)}`);
    console.log(`Remaining: ${formatAmount(remaining)}`);

    if (remaining < 0) {
      console.log('\nWARNING: Budget exceeded!');
    } else if (percentageUsed > 80) {
      console.log('\nWARNING: Over 80% of budget used!');
    }

    // Add category breakdown with bar chart
    const categorySpending = {};
    monthlyExpenses.forEach(expense => {
      categorySpending[expense.category] = (categorySpending[expense.category] || 0) + expense.amount;
    });

    console.log('\nCategory Breakdown:');
    console.log(barChart(categorySpending));

    // Add spending trend with sparkline
    const dailySpending = getDailySpending(monthlyExpenses);
    console.log('\nDaily Spending Trend:');
    console.log(sparkline(dailySpending));
  } catch (error) {
    console.error('Failed to check budget status:', error.message);
    process.exit(1);
  }
};

/**
 * Get daily spending trend data
 * @param {Array} expenses - Array of expenses
 * @returns {Array} Daily spending trend data
 */
const getDailySpending = (expenses) => {
    const dailyTotals = {};
    
    expenses.forEach(expense => {
        const date = formatDate(expense.date);
        dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
    });

    // Fill in missing days with zero
    const days = Object.keys(dailyTotals).sort();
    const startDate = new Date(days[0]);
    const endDate = new Date(days[days.length - 1]);
    
    const result = [];
    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        result.push(dailyTotals[dateStr] || 0);
    }
    
    return result;
};

/**
 * Format date string
 * @param {string} date - Date string
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
    const [year, month, day] = date.split('-');
    return `${year}-${month}-${day}`;
};
  