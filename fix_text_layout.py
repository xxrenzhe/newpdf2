import re

with open("packages/pdfeditor/src/reader/text_layout.js", "r") as f:
    content = f.read()

# Add gap checking logic
gap_logic = """
const getRunReadGap = (textItem, nextTextItem, isVertical) => {
    const transform1 = getTransform(textItem);
    const transform2 = getTransform(nextTextItem);
    if (!transform1 || !transform2) {
        return 0;
    }
    if (isVertical) {
        // Vertical reading: normally top-to-bottom
        // The Y position is transform[5]
        const y1 = transform1[5];
        const y2 = transform2[5];
        // The text height is textItem.height
        // distance from end of textItem to start of nextTextItem
        return y1 < y2 ? y2 - (y1 + (textItem.height || 0)) : y1 - (y2 + (nextTextItem.height || 0));
    } else {
        // Horizontal reading: normally left-to-right
        // The X position is transform[4]
        const x1 = transform1[4];
        const x2 = transform2[4];
        // The text width is textItem.width
        return x1 < x2 ? x2 - (x1 + (textItem.width || 0)) : x1 - (x2 + (nextTextItem.width || 0));
    }
};

const hasLargeReadGap = (textItem, nextTextItem, isVertical) => {
    const gap = getRunReadGap(textItem, nextTextItem, isVertical);
    const size = isVertical ? textItem.width : textItem.height;
    // If the gap is significantly larger than the font size (e.g. 1.5x height), break the run
    const threshold = Math.max(8, (size || 0) * 1.5);
    return gap > threshold;
};
"""

content = content.replace("export const shouldBreakTextRun", gap_logic + "\nexport const shouldBreakTextRun")

break_logic = """
    const pos1 = getRunAxisPosition(textItem, vertical);
    const pos2 = getRunAxisPosition(nextTextItem, vertical);
    if (pos1 !== null && pos2 !== null) {
        const threshold = getAxisBreakThreshold(textItem, nextTextItem, vertical);
        if (Math.abs(pos2 - pos1) > threshold) {
            return true;
        }
    }

    if (hasLargeReadGap(textItem, nextTextItem, vertical)) {
        return true;
    }
"""

content = content.replace("""    const pos1 = getRunAxisPosition(textItem, vertical);
    const pos2 = getRunAxisPosition(nextTextItem, vertical);
    if (pos1 !== null && pos2 !== null) {
        const threshold = getAxisBreakThreshold(textItem, nextTextItem, vertical);
        if (Math.abs(pos2 - pos1) > threshold) {
            return true;
        }
    }""", break_logic)

with open("packages/pdfeditor/src/reader/text_layout.js", "w") as f:
    f.write(content)
