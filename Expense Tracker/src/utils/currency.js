/**
 * @fileoverview Currency Conversion Utility
 * @module utils/currency
 */

// Default exchange rate (USD to PKR)
// This should be updated regularly with real exchange rates
const DEFAULT_PKR_RATE = 280; // Example rate: 1 USD = 280 PKR

/**
 * Convert USD to PKR
 * @param {number} usdAmount - Amount in USD
 * @returns {number} Amount in PKR
 */
export const usdToPkr = (usdAmount) => {
    return usdAmount * DEFAULT_PKR_RATE;
};

/**
 * Convert PKR to USD
 * @param {number} pkrAmount - Amount in PKR
 * @returns {number} Amount in USD
 */
export const pkrToUsd = (pkrAmount) => {
    return pkrAmount / DEFAULT_PKR_RATE;
};

/**
 * Format amount in PKR
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount with PKR symbol
 */
export const formatPkr = (amount) => {
    return `PKR ${amount.toFixed(2)}`;
};

/**
 * Currency conversion class with exchange rate management
 */
export class CurrencyConverter {
    constructor() {
        this.exchangeRate = DEFAULT_PKR_RATE;
    }

    /**
     * Update exchange rate
     * @param {number} newRate - New exchange rate
     */
    setExchangeRate(newRate) {
        if (newRate <= 0) {
            throw new Error('Exchange rate must be positive');
        }
        this.exchangeRate = newRate;
    }

    /**
     * Convert USD to PKR
     * @param {number} usdAmount - Amount in USD
     * @returns {number} Amount in PKR
     */
    convertToPkr(usdAmount) {
        return usdAmount * this.exchangeRate;
    }

    /**
     * Convert PKR to USD
     * @param {number} pkrAmount - Amount in PKR
     * @returns {number} Amount in USD
     */
    convertToUsd(pkrAmount) {
        return pkrAmount / this.exchangeRate;
    }

    /**
     * Format amount in both currencies
     * @param {number} usdAmount - Amount in USD
     * @returns {string} Formatted string with both currencies
     */
    formatBoth(usdAmount) {
        const pkrAmount = this.convertToPkr(usdAmount);
        return `$${usdAmount.toFixed(2)} (PKR ${pkrAmount.toFixed(2)})`;
    }
} 