/**
 * @fileoverview Planning Module - Helps plan and divide expenses
 * @module commands/plan
 * @requires utils/storage
 * @requires utils/errors
 * @requires utils/charts
 */

import { Storage } from '../utils/storage.js';
import { ValidationError } from '../utils/errors.js';
import { pieChart, barChart } from '../utils/charts.js';
import path from 'path';

const storage = new Storage(path.join(process.cwd(), 'data', 'expenses.json'));

// Export default allocation percentages based on 50/30/20 rule
export const DEFAULT_ALLOCATIONS = {
    essentials: 50,    // Essential expenses
    wants: 30,         // Non-essential/lifestyle
    savings: 20        // Savings and debt repayment
};

// Export detailed breakdown within each category
export const CATEGORY_BREAKDOWN = {
    essentials: {
        housing: 25,       // Rent/mortgage
        utilities: 10,     // Bills
        groceries: 10,     // Food
        transport: 5       // Basic transportation
    },
    wants: {
        dining: 10,        // Restaurants
        entertainment: 5,  // Movies, games
        shopping: 10,      // Non-essential items
        hobbies: 5        // Personal interests
    },
    savings: {
        emergency: 10,     // Emergency fund
        retirement: 5,     // Long-term savings
        goals: 5          // Personal goals
    }
};

/**
 * Plan budget allocation
 * @async
 * @param {number} amount - Total amount to plan
 * @param {Object} options - Planning options
 */
export const planBudget = async (amount, options = {}) => {
    try {
        const totalAmount = Number(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new ValidationError('Amount must be a positive number');
        }

        // Get historical data for smart recommendations
        const data = await storage.readData();
        const historicalSpending = analyzeHistoricalSpending(data.expenses);

        // Calculate allocations
        const mainAllocations = calculateMainAllocations(totalAmount);
        const detailedBreakdown = calculateDetailedBreakdown(totalAmount);

        // Display results
        displayPlanningResults(totalAmount, mainAllocations, detailedBreakdown, historicalSpending);

    } catch (error) {
        console.error('Planning error:', error.message);
        process.exit(1);
    }
};

/**
 * Calculate main category allocations
 * @param {number} amount - Total amount
 * @returns {Object} Allocated amounts
 */
const calculateMainAllocations = (amount) => {
    const allocations = {};
    for (const [category, percentage] of Object.entries(DEFAULT_ALLOCATIONS)) {
        allocations[category] = (amount * percentage) / 100;
    }
    return allocations;
};

/**
 * Calculate detailed category breakdown
 * @param {number} amount - Total amount
 * @returns {Object} Detailed breakdown
 */
const calculateDetailedBreakdown = (amount) => {
    const breakdown = {};
    for (const [mainCategory, subcategories] of Object.entries(CATEGORY_BREAKDOWN)) {
        breakdown[mainCategory] = {};
        for (const [subcategory, percentage] of Object.entries(subcategories)) {
            breakdown[mainCategory][subcategory] = (amount * percentage) / 100;
        }
    }
    return breakdown;
};

/**
 * Analyze historical spending patterns
 * @param {Array} expenses - Historical expenses
 * @returns {Object} Spending analysis
 */
const analyzeHistoricalSpending = (expenses) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentExpenses = expenses.filter(exp => 
        new Date(exp.date) >= threeMonthsAgo
    );

    const categoryTotals = {};
    recentExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return categoryTotals;
};

/**
 * Display planning results with visualizations
 * @param {number} total - Total amount
 * @param {Object} mainAllocations - Main category allocations
 * @param {Object} breakdown - Detailed breakdown
 * @param {Object} historical - Historical spending
 */
const displayPlanningResults = (total, mainAllocations, breakdown, historical) => {
    console.log('\nBudget Planning Results');
    console.log('=====================');
    console.log(`Total Amount: $${total.toFixed(2)}\n`);

    // Show main allocations with pie chart
    console.log('Main Allocations:');
    console.log(pieChart(mainAllocations));
    Object.entries(mainAllocations).forEach(([category, amount]) => {
        console.log(`${category.padEnd(15)}: $${amount.toFixed(2)}`);
    });

    // Show detailed breakdown with bar charts
    console.log('\nDetailed Breakdown:');
    for (const [category, subcategories] of Object.entries(breakdown)) {
        console.log(`\n${category.toUpperCase()}:`);
        console.log(barChart(subcategories));
        Object.entries(subcategories).forEach(([subcat, amount]) => {
            console.log(`  ${subcat.padEnd(15)}: $${amount.toFixed(2)}`);
        });
    }

    // Show recommendations based on historical data
    console.log('\nRecommendations:');
    generateRecommendations(mainAllocations, historical).forEach(rec => {
        console.log(`- ${rec}`);
    });
};

/**
 * Generate spending recommendations
 * @param {Object} planned - Planned allocations
 * @param {Object} historical - Historical spending
 * @returns {Array} Array of recommendations
 */
const generateRecommendations = (planned, historical) => {
    const recommendations = [];
    const totalHistorical = Object.values(historical).reduce((sum, val) => sum + val, 0);
    
    if (totalHistorical > 0) {
        Object.entries(historical).forEach(([category, amount]) => {
            const percentage = (amount / totalHistorical) * 100;
            if (percentage > 40) {
                recommendations.push(
                    `Consider reducing spending in '${category}' - currently ${percentage.toFixed(1)}% of total`
                );
            }
        });
    }

    recommendations.push('Set aside emergency fund in savings category');
    recommendations.push('Track essential expenses carefully');
    
    return recommendations;
}; 