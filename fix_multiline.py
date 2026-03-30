import re
with open("packages/pdfeditor/src/reader/text_layout.js", "r") as f:
    content = f.read()

# [KISS Optimization] 启发式多行段落合并逻辑
# 原本只要 Y 坐标（水平排版）或 X 坐标（垂直排版）发生哪怕一点点跳动，就会被 getAxisBreakThreshold 拦截截断。
# 我们需要识别“如果是一个合格的换行”（X 坐标回退到开头，Y 坐标往下走了一个 font-size 的距离，且字体大小颜色一致），就将其聚合成一个编辑框！
new_logic = """
const getRunLineGap = (textItem, nextTextItem, isVertical) => {
    const transform1 = getTransform(textItem);
    const transform2 = getTransform(nextTextItem);
    if (!transform1 || !transform2) return 0;
    if (isVertical) {
        // Vertical reading: the X position defines the column
        return transform1[4] - transform2[4]; // Next column moves left
    } else {
        // Horizontal reading: the Y position defines the line
        return transform1[5] - transform2[5]; // Next line moves down (Y decreases in PDF coords)
    }
};

export const shouldBreakTextRun = (textItem, nextTextItem) => {
    if (!textItem || !nextTextItem) return true;

    // [KISS Optimization] 段落与字体强一致性：颜色不同绝对截断
    if (textItem.color !== nextTextItem.color) return true;

    if (hasRotationDrift(textItem, nextTextItem)) return true;

    const vertical = isVerticalTextRun(textItem);
    if (vertical !== isVerticalTextRun(nextTextItem)) return true;

    const pos1 = getRunAxisPosition(textItem, vertical);
    const pos2 = getRunAxisPosition(nextTextItem, vertical);
    
    // [KISS Optimization] 智能多行段落合并 (Heuristic Multi-line Clustering)
    if (pos1 !== null && pos2 !== null) {
        const axisDrift = Math.abs(pos2 - pos1);
        const threshold = getAxisBreakThreshold(textItem, nextTextItem, vertical);
        
        if (axisDrift > threshold) {
            // It might be a new line! Let's check line gap
            const lineGap = getRunLineGap(textItem, nextTextItem, vertical);
            const size = vertical ? textItem.width : textItem.height;
            // A typical line gap is roughly 1.0x to 1.8x the font size
            if (lineGap > (size * 0.8) && lineGap < (size * 2.2)) {
                // Furthermore, the next item should jump back (carriage return)
                const readGap = getRunReadGap(textItem, nextTextItem, vertical);
                // readGap is calculated as if they were on the same line. 
                // A carriage return means the next item's start is far behind the current item's end.
                if (readGap < -(size * 2)) {
                    // It's a valid new line within the same paragraph! Don't break.
                    // But wait, are they using the same font size?
                    if (!hasDimensionDrift(textItem, nextTextItem, vertical ? 'width' : 'height')) {
                        return false; 
                    }
                }
            }
            return true; // Not a valid new line, break it.
        }
    }

    if (hasLargeReadGap(textItem, nextTextItem, vertical)) {
        return true;
    }
"""

old_logic = r"""export const shouldBreakTextRun = \(textItem, nextTextItem\) => \{
    if \(!textItem \|\| !nextTextItem\) \{
        return true;
    \}

    if \(textItem\.color !== nextTextItem\.color\) \{
        return true;
    \}

    if \(hasRotationDrift\(textItem, nextTextItem\)\) \{
        return true;
    \}

    const vertical = isVerticalTextRun\(textItem\);
    if \(vertical !== isVerticalTextRun\(nextTextItem\)\) \{
        return true;
    \}


    const pos1 = getRunAxisPosition\(textItem, vertical\);
    const pos2 = getRunAxisPosition\(nextTextItem, vertical\);
    if \(pos1 !== null && pos2 !== null\) \{
        const threshold = getAxisBreakThreshold\(textItem, nextTextItem, vertical\);
        if \(Math\.abs\(pos2 - pos1\) > threshold\) \{
            return true;
        \}
    \}

    if \(hasLargeReadGap\(textItem, nextTextItem, vertical\)\) \{
        return true;
    \}"""

content = re.sub(old_logic, new_logic, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/reader/text_layout.js", "w") as f:
    f.write(content)
