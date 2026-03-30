import re
with open("packages/pdfeditor/src/reader/text_layout.js", "r") as f:
    content = f.read()

old_block = r"""    if \(nextWidth === 0\) \{
        const width = Math\.max\(currentWidth, nextWidth\);
        const threshold = Math\.max\(8, width \* 0\.6\);
        return \(nextTextItem\.height \|\| 0\) > threshold;
    \}

    return hasDimensionDrift\(textItem, nextTextItem, 'width'\);"""

new_block = """    if (nextWidth === 0) {
        const width = Math.max(currentWidth, nextWidth);
        const threshold = Math.max(8, width * 0.6);
        return (nextTextItem.height || 0) > threshold;
    }

    const gapWidth = getRunReadGap(textItem, nextTextItem, vertical);
    const maxW = Math.max(currentWidth, nextWidth);
    if (gapWidth < (maxW * 0.4)) {
        return false;
    }

    return hasDimensionDrift(textItem, nextTextItem, 'width');"""

content = re.sub(old_block, new_block, content)

with open("packages/pdfeditor/src/reader/text_layout.js", "w") as f:
    f.write(content)
