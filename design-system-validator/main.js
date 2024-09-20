// Helper function to convert RGB to Hex
function rgbToHex(r, g, b) {
    const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
    const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
    const bHex = Math.round(b * 255).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
}

// Recursive function to validate styles for all nodes
async function validateLocalStyles(nodes) {
    const paintStyles = await figma.getLocalPaintStylesAsync(); // Update here
    const textStyles = await figma.getLocalTextStylesAsync(); // Update if needed
    const issues = [];

    function checkNode(node) {
        let fillChecked = false;
        let strokeChecked = false;

        // Check fills
        if ('fills' in node) {
            const fills = node.fills;
            for (const fill of fills) {
                if (fill.type === 'SOLID') {
                    const fillColor = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
                    const isColorUsed = paintStyles.some(style => {
                        const colorInStyle = rgbToHex(style.paints[0].color.r, style.paints[0].color.g, style.paints[0].color.b);
                        return colorInStyle === fillColor;
                    });

                    if (!isColorUsed) {
                        issues.push(`Layer name: ${node.name}, Color ${fillColor} issue: is not using a local style.`);
                    } else {
                        fillChecked = true;
                    }
                }
            }
        }

        // Check strokes
        if ('strokes' in node) {
            const strokes = node.strokes;
            for (const stroke of strokes) {
                if (stroke.type === 'SOLID') {
                    const strokeColor = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
                    const isColorUsed = paintStyles.some(style => {
                        const colorInStyle = rgbToHex(style.paints[0].color.r, style.paints[0].color.g, style.paints[0].color.b);
                        return colorInStyle === strokeColor;
                    });

                    if (!isColorUsed) {
                        issues.push(`Layer name: ${node.name}, Stroke ${strokeColor} issue: is not using a local style.`);
                    } else {
                        strokeChecked = true;
                    }
                }
            }
        }

        // Check text styles for the node
        if ('textStyleId' in node && node.textStyleId) {
            const textStyle = figma.getStyleById(node.textStyleId);
            const isTextStyleUsed = textStyles.some(style => style.id === node.textStyleId);

            if (!textStyle || !isTextStyleUsed) {
                issues.push(`Layer name: ${node.name}, Text style issue: is missing or not using a local text style.`);
            }
        }

        // Recursively check child nodes
        if ('children' in node) {
            node.children.forEach(checkNode);
        }
    }

    nodes.forEach(checkNode);
    return issues;
}

// Function to handle validation and UI updates
async function validateAndDisplay(selectedNodes) {
    const issues = await validateLocalStyles(selectedNodes);
    const notification = issues.length === 0 ? 'All elements are using local styles!' : `Validation issues found: ${issues.length}`;
    
    // Send the results to the UI
    figma.ui.postMessage({ type: 'result', issues, notification });
}

// Main function to run the plugin
figma.on('run', async () => {
    await figma.loadAllPagesAsync(); // Load all pages before running
    figma.showUI(__html__, { width: 1000, height: 400 });

    const selectedNodes = figma.currentPage.selection;
    await validateAndDisplay(selectedNodes);
});

// Listen for messages from the UI
figma.ui.onmessage = (msg) => {
    if (msg.type === 'validate') {
        const selectedNodes = figma.currentPage.selection;
        validateAndDisplay(selectedNodes);
    }
};

// Load all pages and then listen for changes
(async () => {
    await figma.loadAllPagesAsync();

    // Listen for changes to the selection
    figma.on('selectionchange', async () => {
        const selectedNodes = figma.currentPage.selection;
        if (selectedNodes.length > 0) {
            await validateAndDisplay(selectedNodes);
        }
    });

    // Listen for changes in the document
    figma.on('documentchange', async () => {
        const selectedNodes = figma.currentPage.selection;
        if (selectedNodes.length > 0) {
            await validateAndDisplay(selectedNodes);
        }
    });
})();
