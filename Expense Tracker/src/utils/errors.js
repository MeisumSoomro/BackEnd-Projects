/**
 * @fileoverview Custom Error Classes for Expense Tracker
 * @module utils/errors
 */

/**
 * Error class for validation failures
 * @class ValidationError
 * @extends Error
 */
export class ValidationError extends Error {
  /**
   * Create a validation error
   * @param {string} message - Error message
   */
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error class for storage operations failures
 * @class StorageError
 * @extends Error
 */
export class StorageError extends Error {
  /**
   * Create a storage error
   * @param {string} message - Error message
   */
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
} 