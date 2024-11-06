/**
 * @fileoverview CLI Chart Utilities - Provides visual data representation
 * @module utils/charts
 */

/**
 * Create a progress circle
 * @param {number} percentage - Progress percentage (0-100)
 * @param {number} [size=10] - Circle size in characters
 * @returns {string} ASCII progress circle
 */
export const progressCircle = (percentage, size = 10) => {
    const filled = Math.round((percentage / 100) * size);
    const empty = size - filled;
    return `[${'#'.repeat(filled)}${'-'.repeat(empty)}] ${percentage.toFixed(1)}%`;
};

/**
 * Create a vertical bar chart
 * @param {Object} data - Key-value pairs for the chart
 * @param {number} [height=10] - Maximum height of bars
 * @returns {string} ASCII bar chart
 */
export const barChart = (data, height = 10) => {
    const maxValue = Math.max(...Object.values(data));
    const scale = height / maxValue;
    
    let chart = '';
    const bars = Object.entries(data).map(([label, value]) => {
        const barHeight = Math.round(value * scale);
        return {
            label,
            bar: '█'.repeat(barHeight) + ' '.repeat(height - barHeight),
            value
        };
    });

    // Draw bars vertically
    for (let i = height - 1; i >= 0; i--) {
        bars.forEach(bar => {
            chart += `${bar.bar[i]} `;
        });
        chart += '\n';
    }

    // Add labels
    bars.forEach(bar => {
        chart += `${bar.label.slice(0, 3)} `;
    });
    chart += '\n';

    return chart;
};

/**
 * Create a horizontal sparkline
 * @param {number[]} data - Array of numbers
 * @param {number} [width=20] - Width of sparkline
 * @returns {string} ASCII sparkline
 */
export const sparkline = (data, width = 20) => {
    const chars = '▁▂▃▄▅▆▇█';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    return data.map(value => {
        const normalized = (value - min) / range;
        const index = Math.floor(normalized * (chars.length - 1));
        return chars[index];
    }).join('');
};

/**
 * Create a pie chart
 * @param {Object} data - Key-value pairs for the chart
 * @returns {string} ASCII pie chart
 */
export const pieChart = (data) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const symbols = ['◐', '◓', '◑', '◒'];
    let chart = '';
    let accumulated = 0;

    Object.entries(data).forEach(([label, value]) => {
        const percentage = (value / total) * 100;
        accumulated += percentage;
        const symbolIndex = Math.floor((accumulated / 100) * symbols.length) % symbols.length;
        chart += `${symbols[symbolIndex]} ${label}: ${percentage.toFixed(1)}%\n`;
    });

    return chart;
}; 