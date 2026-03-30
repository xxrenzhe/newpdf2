import re
with open("packages/pdfeditor/src/reader/text_layout.js", "r") as f:
    content = f.read()

old_block = r"""        if \(nextHeight === 0\) \{
            const height = Math\.max\(currentHeight, nextHeight\);
            const threshold = Math\.max\(8, height \* 0\.6\);
            return \(nextTextItem\.width \|\| 0\) > threshold;
        \}

        return hasDimensionDrift\(textItem, nextTextItem, 'height'\);"""

new_block = """        if (nextHeight === 0) {
            const height = Math.max(currentHeight, nextHeight);
            const threshold = Math.max(8, height * 0.6);
            return (nextTextItem.width || 0) > threshold;
        }

        // [KISS Optimization] 公式符号/角标智能融合识别：若物理字间距极小，容忍字体大小/高度的突变（不强行截断），从而保持整个公式和大小混排文字在一个编辑框内
        const gap = getRunReadGap(textItem, nextTextItem, vertical);
        const maxH = Math.max(currentHeight, nextHeight);
        if (gap < (maxH * 0.4)) {
            return false;
        }

        return hasDimensionDrift(textItem, nextTextItem, 'height');"""

content = re.sub(old_block, new_block, content)

with open("packages/pdfeditor/src/reader/text_layout.js", "w") as f:
    f.write(content)
