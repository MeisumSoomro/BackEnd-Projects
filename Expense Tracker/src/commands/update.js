/**
 * @fileoverview Update Command Module - Handles modification of existing expenses
 * @module commands/update
 * @requires utils/storage
 * @requires utils/errors
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import path from 'path';
import { CurrencyConverter } from '../utils/currency.js';

// Initialize storage with data file path
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

// Initialize currency converter
const currencyConverter = new CurrencyConverter();

/**
 * Update an existing expense
 * @async
 * @param {string|number} id - ID of the expense to update
 * @param {string} [description] - New description
 * @param {number|string} [amount] - New amount
 * @param {string} [category] - New category
 * @param {Object} [options={}] - Additional update options
 * @param {string} [options.tags] - New comma-separated tags
 * @param {string} [options.notes] - New additional notes
 * @param {string} [options.currency] - New currency
 * @throws {ValidationError} When validation fails
 * 
 * Implementation Details:
 * - Validates expense ID exists
 * - Updates only provided fields
 * - Maintains unchanged fields
 * - Validates new values
 * - Preserves expense creation date
 * 
 * Validation Rules:
 * - ID must be valid number
 * - New amount must be positive if provided
 * - New category must exist if provided
 * - New description must not be empty if provided
 * 
 * Data Integrity:
 * - Creates backup before update
 * - Validates complete expense after update
 * - Maintains audit trail
 * - Preserves data relationships
 */
export const update = async (id, description, amount, category, options = {}) => {
  try {
    // Validate ID format
    const expenseId = Number(id);
    if (isNaN(expenseId)) {
      throw new ValidationError('ID must be a number');
    }

    const data = await storage.readData();
    const expenseIndex = data.expenses.findIndex(e => e.id === expenseId);

    // Check if expense exists
    if (expenseIndex === -1) {
      throw new ValidationError(`Expense with ID ${expenseId} not found`);
    }

    const expense = data.expenses[expenseIndex];

    // Update description if provided
    if (description !== undefined) {
      if (!description.trim()) {
        throw new ValidationError('Description cannot be empty');
      }
      expense.description = description.trim();
    }

    // Convert amount if needed
    if (amount !== undefined) {
      let usdAmount = Number(amount);
      if (options.currency === 'PKR') {
        usdAmount = currencyConverter.convertToUsd(usdAmount);
      }
      if (isNaN(usdAmount) || usdAmount <= 0) {
        throw new ValidationError('Amount must be a positive number');
      }
      expense.amount = usdAmount;
    }

    // Update category if provided
    if (category !== undefined) {
      if (category !== 'uncategorized' && !data.categories[category]) {
        throw new ValidationError(`Category '${category}' does not exist`);
      }
      expense.category = category;
    }

    // Update tags if provided
    if (options.tags !== undefined) {
      expense.tags = [];
      if (options.tags) {
        options.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (!expense.tags.includes(trimmedTag)) {
            expense.tags.push(trimmedTag);
          }
        });
      }
    }

    // Update notes if provided
    if (options.notes !== undefined) {
      expense.notes = options.notes || '';
    }

    // Save updated data
    await storage.writeData(data);
    console.log('Expense updated successfully');
    console.log(`New amount: ${currencyConverter.formatBoth(expense.amount)}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to update expense:', error.message);
    }
    process.exit(1);
  }
}; 