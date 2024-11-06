/**
 * @fileoverview Budget Planner GUI - Visual budget allocation tool
 * @requires blessed
 * @requires blessed-contrib
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { DEFAULT_ALLOCATIONS, CATEGORY_BREAKDOWN } from '../commands/plan.js';

export class BudgetPlannerGUI {
    constructor(screen, amount) {
        this.screen = screen;
        this.amount = Number(amount);
        this.showPlannerWindow();
    }

    showPlannerWindow() {
        // Create main container
        const plannerBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '90%',
            height: '90%',
            label: ' Budget Planner ',
            tags: true,
            border: { type: 'line' },
            style: {
                border: { fg: 'blue' }
            }
        });

        // Create layout grid
        const grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: plannerBox
        });

        // Add donut chart for main allocations
        const mainDonut = grid.set(0, 0, 6, 6, contrib.donut, {
            label: 'Main Allocations',
            radius: 8,
            arcWidth: 3,
            yPadding: 2,
            data: this.getMainAllocationData()
        });

        // Add bar chart for detailed breakdown
        const detailBar = grid.set(0, 6, 6, 6, contrib.bar, {
            label: 'Detailed Breakdown',
            barWidth: 4,
            barSpacing: 6,
            xOffset: 0,
            maxHeight: 9
        });

        // Add detailed text breakdown
        const breakdown = blessed.text({
            parent: plannerBox,
            top: 6,
            left: 2,
            height: '50%',
            width: '96%',
            content: this.getDetailedBreakdown(),
            tags: true,
            scrollable: true,
            mouse: true
        });

        // Add interactive controls
        const controls = blessed.box({
            parent: plannerBox,
            bottom: 1,
            left: 'center',
            width: '50%',
            height: 3,
            content: '{center}Press [arrow keys] to adjust | [Enter] to save | [Esc] to close{/center}',
            tags: true,
            style: {
                fg: 'yellow'
            }
        });

        // Update bar chart data
        detailBar.setData({
            titles: Object.keys(CATEGORY_BREAKDOWN.necessities),
            data: Object.values(CATEGORY_BREAKDOWN.necessities).map(p => (this.amount * p) / 100)
        });

        // Add key handlers
        plannerBox.key(['escape', 'q'], () => {
            plannerBox.destroy();
            this.screen.render();
        });

        // Add arrow key handlers for adjusting allocations
        plannerBox.key(['left', 'right', 'up', 'down'], (ch, key) => {
            // Implement allocation adjustment logic
            this.screen.render();
        });

        this.screen.render();
    }

    getMainAllocationData() {
        return Object.entries(DEFAULT_ALLOCATIONS).map(([label, percent]) => ({
            percent: percent,
            label: label,
            color: this.getAllocationColor(label)
        }));
    }

    getAllocationColor(category) {
        const colors = {
            necessities: 'red',
            savings: 'green',
            lifestyle: 'yellow'
        };
        return colors[category] || 'white';
    }

    getDetailedBreakdown() {
        let output = `{bold}Total Amount: $${this.amount.toFixed(2)}{/bold}\n\n`;

        Object.entries(DEFAULT_ALLOCATIONS).forEach(([category, percent]) => {
            const amount = (this.amount * percent) / 100;
            output += `{bold}${category.toUpperCase()}: $${amount.toFixed(2)} (${percent}%){/bold}\n`;

            if (CATEGORY_BREAKDOWN[category]) {
                Object.entries(CATEGORY_BREAKDOWN[category]).forEach(([subcat, subPercent]) => {
                    const subAmount = (this.amount * subPercent) / 100;
                    output += `  ${subcat}: $${subAmount.toFixed(2)} (${subPercent}%)\n`;
                });
            }
            output += '\n';
        });

        return output;
    }
} 