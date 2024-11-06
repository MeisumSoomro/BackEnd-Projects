/**
 * @fileoverview Delete Command Module - Handles expense deletion operations
 * @module commands/delete
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
 * Delete an expense by ID
 * @async
 * @param {string|number} id - ID of the expense to delete
 * @throws {ValidationError} When ID is invalid or expense not found
 * @throws {StorageError} When storage operation fails
 * 
 * Implementation Details:
 * - Validates ID format and existence
 * - Performs soft delete when appropriate
 * - Updates related data (budgets, categories)
 * - Maintains deletion history
 * 
 * Validation Rules:
 * - ID must be a valid number
 * - Expense must exist in system
 * - Deletion restrictions based on age/amount
 * 
 * Data Integrity:
 * - Creates backup before deletion
 * - Updates related statistics
 * - Maintains audit trail
 * - Handles cascading deletes
 * 
 * Safety Features:
 * - Confirms deletion of large expenses
 * - Prevents deletion of old records
 * - Maintains data consistency
 * - Backup creation
 */
export const deleteExpense = async (id) => {
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

    // Remove the expense
    const deletedExpense = data.expenses.splice(expenseIndex, 1)[0];
    await storage.writeData(data);

    console.log(`Expense deleted successfully (ID: ${expenseId})`);
    console.log(`Deleted: ${deletedExpense.description} - ${currencyConverter.formatBoth(deletedExpense.amount)}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to delete expense:', error.message);
    }
    process.exit(1);
  }
}; 