/**
 * @fileoverview Storage Handler - Manages data persistence
 * @module utils/storage
 * @requires fs
 * @requires path
 */

import fs from 'fs';
import path from 'path';

/**
 * Class handling data storage operations
 * @class Storage
 * @description Manages reading and writing expense data to filesystem
 */
export class Storage {
  /**
   * Initialize storage handler
   * @constructor
   * @param {string} filePath - Path to data storage file
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.ensureFileExists();
  }

  /**
   * Initialize storage system
   * @async
   * @method initialize
   * @throws {StorageError} When initialization fails
   */
  async initialize() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      // Initialize data file with default structure if it doesn't exist
      try {
        await fs.access(this.filePath);
      } catch {
        const defaultData = {
          expenses: [],
          metadata: { lastId: 0 },
          categories: {},
          budgets: {}
        };
        await this.writeData(defaultData);
      }
    } catch (error) {
      throw new StorageError(`Failed to initialize storage: ${error.message}`);
    }
  }

  /**
   * Read data from storage
   * @returns {Promise<Object>} The parsed data
   * @throws {StorageError} If read operation fails
   */
  async readData() {
    try {
      await this.initialize();
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`Failed to read data: ${error.message}`);
    }
  }

  /**
   * Write data to storage with automatic backup
   * @param {Object} data - Data to write
   * @throws {StorageError} If write operation fails
   */
  async writeData(data) {
    try {
      await this.initialize();
      // Create backup of existing data
      const existingData = await this.readData().catch(() => null);
      if (existingData) {
        const backupPath = `${this.filePath}.backup`;
        await fs.writeFile(backupPath, JSON.stringify(existingData, null, 2));
      }
      
      // Write new data
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new StorageError(`Failed to write data: ${error.message}`);
    }
  }

  /**
   * Get next available ID for new expenses
   * @returns {Promise<number>} Next available ID
   */
  async getNextId() {
    const data = await this.readData();
    return (data.metadata.lastId || 0) + 1;
  }

  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create file if it doesn't exist
    if (!fs.existsSync(this.filePath)) {
      this.saveData({ expenses: [] });
    }
  }

  loadData() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading data:', error);
      return { expenses: [] };
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  }

  addExpense(expense) {
    const data = this.loadData();
    
    // Validate expense object
    if (!expense.amount || !expense.description) {
      throw new Error('Amount and description are required');
    }

    // Add ID and timestamp if not present
    const newExpense = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...expense
    };

    // Add to expenses array
    data.expenses.push(newExpense);
    
    // Save updated data
    this.saveData(data);
    
    return newExpense;
  }

  getExpenses() {
    const data = this.loadData();
    return data.expenses;
  }

  getExpenseById(id) {
    const data = this.loadData();
    return data.expenses.find(expense => expense.id === id);
  }

  updateExpense(id, updatedExpense) {
    const data = this.loadData();
    const index = data.expenses.findIndex(expense => expense.id === id);
    
    if (index === -1) {
      throw new Error('Expense not found');
    }

    data.expenses[index] = {
      ...data.expenses[index],
      ...updatedExpense,
      id, // Preserve the original ID
      modifiedAt: new Date().toISOString()
    };

    this.saveData(data);
    return data.expenses[index];
  }

  deleteExpense(id) {
    const data = this.loadData();
    const index = data.expenses.findIndex(expense => expense.id === id);
    
    if (index === -1) {
      throw new Error('Expense not found');
    }

    data.expenses.splice(index, 1);
    this.saveData(data);
  }
} 