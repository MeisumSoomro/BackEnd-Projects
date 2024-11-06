/**
 * @fileoverview Expense Model - Core data structure for expense entries
 * @module models/expense
 * @requires utils/errors
 */

/**
 * Class representing an expense entry
 * @class Expense
 * @description Handles the creation and validation of expense entries
 */
export class Expense {
  /**
   * Create an expense
   * @constructor
   * @param {string} description - The expense description
   * @param {number} amount - The expense amount
   * @param {string} [category='uncategorized'] - The expense category
   * @throws {ValidationError} When input parameters are invalid
   */
  constructor(description, amount, category = 'uncategorized') {
    /** @private */ this.id = null;  // Set during storage
    /** @private */ this.description = description.trim();
    /** @private */ this.amount = Number(amount);
    /** @private */ this.category = category;
    /** @private */ this.date = new Date().toISOString();
    /** @private */ this.tags = [];
    /** @private */ this.notes = '';
  }

  /**
   * Validate all expense properties
   * @method validate
   * @throws {ValidationError} When validation fails
   */
  validate() {
    // Amount validation
    if (isNaN(this.amount) || this.amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    // Description validation
    if (!this.description) {
      throw new ValidationError('Description is required');
    }
    if (this.description.length < 3) {
      throw new ValidationError('Description must be at least 3 characters long');
    }
    // Category validation
    if (typeof this.category !== 'string') {
      throw new ValidationError('Category must be a string');
    }
    // Date validation
    if (!Date.parse(this.date)) {
      throw new ValidationError('Invalid date format');
    }
  }

  /**
   * Add a tag to the expense
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Add notes to the expense
   * @param {string} notes - Notes to add
   */
  addNotes(notes) {
    this.notes = notes;
  }

  /**
   * Convert expense to JSON format
   * @returns {Object} JSON representation of the expense
   */
  toJSON() {
    return {
      id: this.id,
      description: this.description,
      amount: this.amount,
      category: this.category,
      date: this.date,
      tags: this.tags,
      notes: this.notes
    };
  }
} 