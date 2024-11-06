/**
 * @fileoverview Enhanced Expense Creation Module - Comprehensive expense management
 * @module commands/createExpense
 * @requires utils/storage
 * @requires models/expense
 * @requires utils/errors
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import { Expense } from '../models/expense.js';
import { ValidationError, StorageError } from '../utils/errors.js';
import { CurrencyConverter } from '../utils/currency.js';
import path from 'path';

// Initialize core services
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));
const currencyConverter = new CurrencyConverter();

/**
 * Enhanced expense creation with comprehensive validation and processing
 * @async
 * @param {string} description - Detailed description of the expense
 * @param {number|string} amount - Amount in specified currency
 * @param {string} category - Expense category
 * @param {Object} options - Extended configuration options
 * @param {string} [options.currency='USD'] - Currency code (USD/PKR)
 * @param {string} [options.tags] - Comma-separated tags
 * @param {string} [options.notes] - Additional notes
 * @param {string} [options.date] - Custom date (ISO format)
 * @param {boolean} [options.recurring=false] - Is this a recurring expense
 * @param {string} [options.frequency] - Recurring frequency (daily/weekly/monthly)
 * @param {string} [options.paymentMethod] - Payment method used
 * @returns {Promise<Object>} Created expense object with metadata
 * @throws {ValidationError} For invalid input data
 * @throws {StorageError} For storage-related issues
 */
export const createExpense = async (description, amount, category, options = {}) => {
    try {
        // Initialize storage and validate structure
        await storage.initialize();
        const data = await storage.readData();

        // Comprehensive input validation
        validateInputs(description, amount, category, options);
        await validateCategory(category, data);

        // Process amount with currency conversion
        const processedAmount = processAmount(amount, options.currency);

        // Create base expense object
        const expense = new Expense(description, processedAmount, category);

        // Add metadata and optional fields
        enrichExpenseData(expense, options);

        // Validate complete expense object
        expense.validate();

        // Generate ID and save
        const savedExpense = await saveExpense(expense, data);

        // Generate success message with details
        displaySuccess(savedExpense, options.currency);

        return savedExpense;

    } catch (error) {
        handleError(error);
        process.exit(1);
    }
};

/**
 * Validate all input parameters
 * @private
 */
const validateInputs = (description, amount, category, options) => {
    // Description validation
    if (!description || description.trim().length < 3) {
        throw new ValidationError('Description must be at least 3 characters long');
    }

    // Amount validation
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new ValidationError('Amount must be a positive number');
    }

    // Category validation
    if (!category || !category.trim()) {
        throw new ValidationError('Category is required');
    }

    // Date validation if provided
    if (options.date && !isValidDate(options.date)) {
        throw new ValidationError('Invalid date format. Use ISO date format');
    }

    // Recurring options validation
    if (options.recurring && !['daily', 'weekly', 'monthly'].includes(options.frequency)) {
        throw new ValidationError('Invalid recurring frequency');
    }
};

/**
 * Validate category exists in system
 * @private
 */
const validateCategory = async (category, data) => {
    if (!data.categories) {
        throw new ValidationError('No categories defined. Please add categories first.');
    }

    if (category !== 'uncategorized' && !data.categories[category]) {
        throw new ValidationError(
            `Category '${category}' does not exist. Available categories: ` +
            `${Object.keys(data.categories).join(', ')}`
        );
    }
};

/**
 * Process and convert amount if needed
 * @private
 */
const processAmount = (amount, currency = 'USD') => {
    const numAmount = Number(amount);
    return currency === 'PKR' 
        ? currencyConverter.convertToUsd(numAmount)
        : numAmount;
};

/**
 * Enrich expense with additional data
 * @private
 */
const enrichExpenseData = (expense, options) => {
    // Add tags if provided
    if (options.tags) {
        options.tags.split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .forEach(tag => expense.addTag(tag));
    }

    // Add notes if provided
    if (options.notes) {
        expense.addNotes(options.notes);
    }

    // Add custom date if provided
    if (options.date) {
        expense.date = new Date(options.date).toISOString();
    }

    // Add recurring information if applicable
    if (options.recurring) {
        expense.recurring = {
            isRecurring: true,
            frequency: options.frequency,
            nextDate: calculateNextDate(expense.date, options.frequency)
        };
    }

    // Add payment method if provided
    if (options.paymentMethod) {
        expense.paymentMethod = options.paymentMethod;
    }
};

/**
 * Save expense to storage
 * @private
 */
const saveExpense = async (expense, data) => {
    expense.id = await storage.getNextId();
    data.expenses.push(expense);
    data.metadata.lastId = expense.id;
    await storage.writeData(data);
    return expense;
};

/**
 * Display success message with expense details
 * @private
 */
const displaySuccess = (expense, currency) => {
    console.log('\nExpense added successfully!');
    console.log('------------------------');
    console.log(`ID: ${expense.id}`);
    console.log(`Description: ${expense.description}`);
    console.log(`Amount: ${currency === 'PKR' 
        ? currencyConverter.formatBoth(expense.amount)
        : `$${expense.amount.toFixed(2)}`}`);
    console.log(`Category: ${expense.category}`);
    console.log(`Date: ${new Date(expense.date).toLocaleDateString()}`);
    if (expense.tags.length) console.log(`Tags: ${expense.tags.join(', ')}`);
    if (expense.notes) console.log(`Notes: ${expense.notes}`);
    if (expense.recurring) console.log(`Recurring: ${expense.recurring.frequency}`);
    console.log('------------------------');
};

/**
 * Handle errors with detailed messages
 * @private
 */
const handleError = (error) => {
    if (error instanceof ValidationError) {
        console.error('Validation error:', error.message);
    } else if (error instanceof StorageError) {
        console.error('Storage error:', error.message);
    } else {
        console.error('Unexpected error:', error.message);
    }
};

/**
 * Validate date string format
 * @private
 */
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

/**
 * Calculate next date for recurring expenses
 * @private
 */
const calculateNextDate = (currentDate, frequency) => {
    const date = new Date(currentDate);
    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
    }
    return date.toISOString();
}; 