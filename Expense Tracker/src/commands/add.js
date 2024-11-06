/**
 * @fileoverview Add Command Module - Handles creation of new expenses
 * @module commands/add
 * @requires utils/storage
 * @requires models/expense
 * @requires utils/errors
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import { Expense } from '../models/expense.js';
import { ValidationError, StorageError } from '../utils/errors.js';
import path from 'path';
import { CurrencyConverter } from '../utils/currency.js';

// Initialize storage with data file path
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

// Initialize currency converter
const currencyConverter = new CurrencyConverter();

/**
 * Add a new expense to the tracker
 * @async
 * @param {string} description - Description of the expense
 * @param {number|string} amount - Amount spent
 * @param {string} category - Category of the expense
 * @param {Object} [options={}] - Additional expense options
 * @param {string} [options.tags] - Comma-separated tags
 * @param {string} [options.notes] - Additional notes
 * @param {string} [options.currency='USD'] - Currency (USD or PKR)
 * @returns {Promise<Expense>} The created expense object
 * @throws {ValidationError} When input validation fails
 * @throws {StorageError} When storage operations fail
 * 
 * Implementation Details:
 * - Validates all input parameters
 * - Converts amount to number type
 * - Normalizes category names
 * - Splits and cleans tags
 * - Assigns unique ID
 * - Timestamps creation
 * 
 * Validation Rules:
 * - Description must not be empty
 * - Amount must be positive number
 * - Category must exist in system
 * - Tags are optional but must be valid strings
 * 
 * Storage Operations:
 * - Reads current data
 * - Generates next ID
 * - Appends new expense
 * - Updates metadata
 * - Saves changes
 */
export const add = async (description, amount, category, options = {}) => {
  try {
    // Initialize storage and ensure data structure exists
    await storage.initialize();
    
    const data = await storage.readData();
    
    // Validate category exists
    if (!data.categories) {
      throw new ValidationError('No categories defined. Please add categories first.');
    }

    if (category !== 'uncategorized' && !data.categories[category]) {
      throw new ValidationError(`Category '${category}' does not exist. Use 'category list' to see available categories.`);
    }

    // Convert amount if needed
    let usdAmount = amount;
    if (options.currency === 'PKR') {
      usdAmount = currencyConverter.convertToUsd(amount);
    }

    // Create expense with converted amount
    const expense = new Expense(description, usdAmount, category);
    
    // Add optional tags if provided
    if (options.tags) {
      options.tags.split(',').forEach(tag => expense.addTag(tag.trim()));
    }
    
    // Add optional notes if provided
    if (options.notes) {
      expense.addNotes(options.notes);
    }

    // Validate expense data
    expense.validate();

    // Assign ID and save
    expense.id = await storage.getNextId();
    data.expenses.push(expense);
    data.metadata.lastId = expense.id;
    
    await storage.writeData(data);
    
    console.log(`Expense added successfully (ID: ${expense.id})`);
    return expense;
  } catch (error) {
    // Handle different types of errors
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else if (error instanceof StorageError) {
      console.error('Storage error:', error.message);
    } else {
      console.error('Unexpected error:', error.message);
    }
    process.exit(1);
  }
}; 