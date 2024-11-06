/**
 * @fileoverview Export Module - Handles exporting expenses to CSV format
 * @module commands/export
 * @requires utils/storage
 * @requires utils/errors
 * @requires fs/promises
 * @requires utils/currency
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import path from 'path';
import fs from 'fs/promises';
import { CurrencyConverter } from '../utils/currency.js';

// Initialize storage with data file path
const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

// Initialize currency converter
const currencyConverter = new CurrencyConverter();

/**
 * Format ISO date to YYYY-MM-DD
 * @param {string} isoDate - Date in ISO format
 * @returns {string} Formatted date string
 */
const formatDate = (isoDate) => {
  return new Date(isoDate).toISOString().split('T')[0];
};

/**
 * Convert expenses array to CSV format
 * @param {Array<Object>} expenses - Array of expense objects
 * @returns {string} CSV formatted string
 * 
 * CSV Format:
 * - Headers: ID,Date,Description,Amount (USD),Amount (PKR),Category,Tags,Notes
 * - Tags are semicolon-separated
 * - Notes have commas replaced with semicolons
 * - Amounts formatted to 2 decimal places
 */
const convertToCSV = (expenses) => {
  const headers = ['ID', 'Date', 'Description', 'Amount (USD)', 'Amount (PKR)', 'Category', 'Tags', 'Notes'];
  const rows = expenses.map(expense => [
    expense.id,
    formatDate(expense.date),
    expense.description,
    expense.amount.toFixed(2),
    currencyConverter.convertToPkr(expense.amount).toFixed(2),
    expense.category,
    expense.tags.join(';'),
    expense.notes.replace(/,/g, ';')
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};

/**
 * Export expenses to CSV file
 * @async
 * @param {number} [month] - Optional month filter (1-12)
 * @param {string} [outputPath] - Custom output file path
 * @throws {ValidationError} When month is invalid
 * @throws {Error} When file operations fail
 * 
 * Features:
 * - Optional month filtering
 * - Custom output path
 * - Default filename with current date
 * - UTF-8 encoding
 * - Data validation
 */
export const exportExpenses = async (month, outputPath) => {
  try {
    const data = await storage.readData();
    let expenses = data.expenses;

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
      console.log('No expenses to export');
      return;
    }

    const defaultFilename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = outputPath || defaultFilename;

    const csv = convertToCSV(expenses);
    await fs.writeFile(filePath, csv);

    console.log(`Expenses exported successfully to ${filePath}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Export failed:', error.message);
    }
    process.exit(1);
  }
}; 