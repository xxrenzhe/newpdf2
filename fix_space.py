with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

import re
old_block = r"""            for \(let i = 0; i < this\.textContentItems\.length; i\+\+\) \{
                let textItem = this\.textContentItems\[i\];
                text \+= textItem\.str;
                if \(lineRotate === null\) \{
                    lineRotate = getTextRotation\(textItem\);
                \}"""

new_block = """            for (let i = 0; i < this.textContentItems.length; i++) {
                let textItem = this.textContentItems[i];
                // [KISS Optimization] 智能重构：补全 PDF 分散文本块中丢失的空格，提升编辑和复制准确性
                if (elements.length > 0) {
                    let prevTextItem = this.textContentItems[i - 1];
                    let isVertical = isVerticalTextRun(textItem);
                    let gap = getRunReadGap(prevTextItem, textItem, isVertical);
                    let size = isVertical ? textItem.width : textItem.height;
                    if (gap > (size || 10) * 0.22 && !prevTextItem.str.endsWith(' ') && !textItem.str.startsWith(' ')) {
                        text += ' ';
                    }
                }
                text += textItem.str;
                if (lineRotate === null) {
                    lineRotate = getTextRotation(textItem);
                }"""

content = re.sub(old_block, new_block, content)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
