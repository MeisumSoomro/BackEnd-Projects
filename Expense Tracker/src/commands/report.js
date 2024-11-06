/**
 * @fileoverview Report Command - Generates detailed expense reports
 * @module commands/report
 * @requires utils/storage
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import path from 'path';

// Initialize storage instance
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

/**
 * Format date for display
 * @param {string} isoDate - Date in ISO format
 * @returns {string} Formatted date YYYY-MM-DD
 */
const formatDate = (isoDate) => {
  return new Date(isoDate).toISOString().split('T')[0];
};

/**
 * Format amount with currency symbol
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount with $ symbol
 */
const formatAmount = (amount) => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Generate monthly expense report
 * @async
 * @param {number} [month] - Month number (1-12), defaults to current month
 * @throws {ValidationError} When month is invalid
 */
export const monthlyReport = async (month) => {
  try {
    const data = await storage.readData();
    const currentMonth = month || new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    // Filter expenses for the month
    const monthlyExpenses = data.expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() + 1 === currentMonth &&
             expenseDate.getFullYear() === year;
    });

    if (monthlyExpenses.length === 0) {
      console.log(`No expenses found for month ${currentMonth}`);
      return;
    }

    // Calculate statistics
    const total = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const dailyExpenses = {};
    const categoryTotals = {};

    monthlyExpenses.forEach(expense => {
      const date = formatDate(expense.date);
      dailyExpenses[date] = (dailyExpenses[date] || 0) + expense.amount;
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    // Find peak spending day
    const peakDay = Object.entries(dailyExpenses)
      .sort(([, a], [, b]) => b - a)[0];

    // Calculate daily average
    const daysInMonth = Object.keys(dailyExpenses).length;
    const dailyAverage = total / daysInMonth;

    // Get budget information
    const budget = data.budgets?.[year]?.[currentMonth] || 0;
    const budgetStatus = budget ? (total / budget) * 100 : 0;

    // Print report with enhanced information
    console.log('\nMonthly Expense Report');
    console.log('====================');
    console.log(`Month: ${currentMonth}/${year}`);
    console.log(`Total Expenses: ${formatAmount(total)}`);
    console.log(`Daily Average: ${formatAmount(dailyAverage)}`);
    console.log(`Peak Spending Day: ${peakDay[0]} (${formatAmount(peakDay[1])})`);
    
    if (budget > 0) {
      console.log(`Budget Status: ${budgetStatus.toFixed(1)}% used`);
    }

    console.log('\nDetailed Expenses:');
    console.log('----------------');
    monthlyExpenses.forEach(expense => {
      console.log(`\nID: ${expense.id}`);
      console.log(`Date: ${formatDate(expense.date)}`);
      console.log(`Description: ${expense.description}`);
      console.log(`Amount: ${formatAmount(expense.amount)}`);
      console.log(`Category: ${expense.category}`);
      if (expense.tags.length > 0) {
        console.log(`Tags: ${expense.tags.join(', ')}`);
      }
      if (expense.notes) {
        console.log(`Notes: ${expense.notes}`);
      }
    });

    console.log('\nCategory Breakdown:');
    Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, amount]) => {
        const percentage = (amount / total) * 100;
        console.log(`  ${category}: ${formatAmount(amount)} (${percentage.toFixed(1)}%)`);
      });

    console.log('\nDaily Spending:');
    Object.entries(dailyExpenses)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, amount]) => {
        console.log(`  ${date}: ${formatAmount(amount)}`);
      });

  } catch (error) {
    console.error('Failed to generate monthly report:', error.message);
    process.exit(1);
  }
};

/**
 * Compare expenses between two months
 * @async
 * @param {number} month1 - First month number (1-12)
 * @param {number} month2 - Second month number (1-12)
 * @throws {ValidationError} When month numbers are invalid
 */
export const compareMonths = async (month1, month2) => {
  try {
    const data = await storage.readData();
    const year = new Date().getFullYear();

    const getMonthExpenses = (month) => {
      return data.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() + 1 === month &&
               expenseDate.getFullYear() === year;
      });
    };

    const month1Expenses = getMonthExpenses(Number(month1));
    const month2Expenses = getMonthExpenses(Number(month2));

    const calculateStats = (expenses) => {
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const categoryTotals = {};
      expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      });
      return { total, categoryTotals };
    };

    const stats1 = calculateStats(month1Expenses);
    const stats2 = calculateStats(month2Expenses);

    console.log('\nMonth Comparison Report');
    console.log('=====================');
    console.log(`Month ${month1} vs Month ${month2}`);
    console.log('\nTotal Expenses:');
    console.log(`Month ${month1}: ${formatAmount(stats1.total)}`);
    console.log(`Month ${month2}: ${formatAmount(stats2.total)}`);
    
    const difference = stats2.total - stats1.total;
    const percentChange = ((difference / stats1.total) * 100).toFixed(1);
    console.log(`Change: ${formatAmount(difference)} (${percentChange}%)`);

    console.log('\nCategory Comparison:');
    const allCategories = new Set([
      ...Object.keys(stats1.categoryTotals),
      ...Object.keys(stats2.categoryTotals)
    ]);

    allCategories.forEach(category => {
      const amount1 = stats1.categoryTotals[category] || 0;
      const amount2 = stats2.categoryTotals[category] || 0;
      const categoryDiff = amount2 - amount1;
      console.log(`\n${category}:`);
      console.log(`  Month ${month1}: ${formatAmount(amount1)}`);
      console.log(`  Month ${month2}: ${formatAmount(amount2)}`);
      console.log(`  Change: ${formatAmount(categoryDiff)}`);
    });

  } catch (error) {
    console.error('Failed to compare months:', error.message);
    process.exit(1);
  }
}; 