/**
 * @fileoverview Category Management Module - Handles expense categorization
 * @module commands/category
 * @requires utils/storage
 * @requires utils/errors
 * @requires utils/charts
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import path from 'path';
import { barChart, sparkline } from '../utils/charts.js';

// Initialize storage with data file path
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

/**
 * Default category configuration
 * @constant {Object}
 * Each category contains:
 * - description: Category purpose
 * - color: Display color for UI
 */
const DEFAULT_CATEGORIES = {
  food: {
    description: 'Food and dining expenses',
    color: 'green'
  },
  transport: {
    description: 'Transportation expenses',
    color: 'blue'
  },
  utilities: {
    description: 'Utility bills and services',
    color: 'yellow'
  },
  entertainment: {
    description: 'Entertainment and leisure',
    color: 'purple'
  }
};

/**
 * Add a new expense category
 * @async
 * @param {string} name - Category name
 * @param {string} [description] - Category description
 * @throws {ValidationError} When name is invalid or category exists
 * 
 * Validation Rules:
 * - Name cannot be empty
 * - Name must be unique
 * - Description is optional
 */
export const addCategory = async (name, description) => {
  try {
    if (!name || !name.trim()) {
      throw new ValidationError('Category name is required');
    }

    const data = await storage.readData();
    
    // Initialize categories if not exists
    if (!data.categories) {
      data.categories = DEFAULT_CATEGORIES;
    }

    // Check if category already exists
    if (data.categories[name]) {
      throw new ValidationError(`Category '${name}' already exists`);
    }

    // Add new category
    data.categories[name] = {
      description: description || '',
      color: 'default'
    };

    await storage.writeData(data);
    console.log(`Category '${name}' added successfully`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to add category:', error.message);
    }
    process.exit(1);
  }
};

/**
 * List all available categories
 * @async
 * @throws {Error} When listing operation fails
 * 
 * Display Format:
 * Available Categories:
 * --------------------
 * category_name:
 *   Description: category_description
 */
export const listCategories = async () => {
  try {
    const data = await storage.readData();
    
    if (!data.categories) {
      data.categories = DEFAULT_CATEGORIES;
      await storage.writeData(data);
    }

    console.log('Available Categories:');
    console.log('--------------------');
    Object.entries(data.categories).forEach(([name, info]) => {
      console.log(`${name}:`);
      console.log(`  Description: ${info.description || 'No description'}`);
    });
  } catch (error) {
    console.error('Failed to list categories:', error.message);
    process.exit(1);
  }
};

/**
 * Delete an existing category
 * @async
 * @param {string} name - Category name to delete
 * @throws {ValidationError} When category not found or in use
 * 
 * Safety Checks:
 * - Verifies category exists
 * - Prevents deletion of categories in use
 * - Maintains data integrity
 */
export const deleteCategory = async (name) => {
  try {
    const data = await storage.readData();
    
    if (!data.categories?.[name]) {
      throw new ValidationError(`Category '${name}' not found`);
    }

    // Check if category is in use
    const inUse = data.expenses.some(expense => expense.category === name);
    if (inUse) {
      throw new ValidationError(`Cannot delete category '${name}' as it is in use`);
    }

    delete data.categories[name];
    await storage.writeData(data);
    console.log(`Category '${name}' deleted successfully`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to delete category:', error.message);
    }
    process.exit(1);
  }
};

/**
 * View expenses for a specific category
 * @async
 * @param {string} name - Category name
 * @param {number} [month] - Optional month filter (1-12)
 * @throws {ValidationError} When category not found or month invalid
 * 
 * Output Format:
 * Expenses for category 'name':
 * --------------------
 * YYYY-MM-DD - Description: $XXX.XX
 * --------------------
 * Total: $X,XXX.XX
 */
export const categoryExpenses = async (name, month) => {
  try {
    const data = await storage.readData();
    
    if (!data.categories?.[name]) {
      throw new ValidationError(`Category '${name}' not found`);
    }

    let expenses = data.expenses.filter(expense => expense.category === name);

    if (month) {
      const monthNum = Number(month);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new ValidationError('Month must be a number between 1 and 12');
      }

      expenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() + 1 === monthNum;
      });
    }

    if (expenses.length === 0) {
      console.log(`No expenses found for category '${name}'`);
      return;
    }

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    console.log(`Expenses for category '${name}':`);
    console.log('--------------------');
    expenses.forEach(expense => {
      console.log(`${formatDate(expense.date)} - ${expense.description}: $${expense.amount.toFixed(2)}`);
    });
    console.log('--------------------');
    console.log(`Total: $${total.toFixed(2)}`);

    // Add spending trend
    const dailyAmounts = getDailySpending(expenses);
    console.log('\nDaily Spending Trend:');
    console.log(sparkline(dailyAmounts));
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to get category expenses:', error.message);
    }
    process.exit(1);
  }
};

const formatDate = (isoDate) => {
  return new Date(isoDate).toISOString().split('T')[0];
};

/**
 * Get daily spending data for visualization
 * @param {Array} expenses - Array of expenses to analyze
 * @returns {Array} Array of daily spending amounts
 */
const getDailySpending = (expenses) => {
    const dailyTotals = {};
    
    // Group expenses by date
    expenses.forEach(expense => {
        const date = formatDate(expense.date);
        dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
    });

    // Fill in missing days with zero
    const days = Object.keys(dailyTotals).sort();
    if (days.length === 0) return [];
    
    const startDate = new Date(days[0]);
    const endDate = new Date(days[days.length - 1]);
    
    const result = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        result.push(dailyTotals[dateStr] || 0);
    }
    
    return result;
}; 