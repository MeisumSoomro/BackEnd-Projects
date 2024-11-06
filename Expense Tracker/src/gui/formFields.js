/**
 * @fileoverview Form Field Components for GUI
 */

import blessed from 'blessed';

export class FormField {
    /**
     * Create a form input field
     */
    static createInput(form, options) {
        const container = blessed.box({
            parent: form,
            top: options.top,
            left: 2,
            right: 2,
            height: 3
        });

        // Label
        blessed.text({
            parent: container,
            content: `${options.label}${options.required ? ' *' : ''}:`,
            top: 0,
            left: 0,
            style: { fg: 'white' }
        });

        // Input field
        const input = blessed.textbox({
            parent: container,
            name: options.name,
            top: 1,
            left: 0,
            right: 0,
            height: 1,
            value: options.value || '',
            inputOnFocus: true,
            mouse: true,
            keys: true,
            style: {
                fg: 'white',
                bg: 'black',
                focus: {
                    fg: 'black',
                    bg: 'white'
                }
            },
            border: {
                type: 'line',
                fg: 'blue'
            }
        });

        return input;
    }
} 