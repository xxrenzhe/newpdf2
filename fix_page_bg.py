with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# [KISS Optimization] 完全规避文字墨迹取色污染：在编辑框左上角的外部边界安全采样，彻底终结黑底残影。
old_logic = r"        let bgX = x \+ \(textPart\.bounds \? \(textPart\.bounds\.right - textPart\.bounds\.left\) / 2 : 0\);\n        let bgY = y \+ \(textPart\.bounds \? \(textPart\.bounds\.bottom - textPart\.bounds\.top\) / 2 : 0\);\n        let bgColor = elDiv\.getAttribute\('data-bgcolor'\) \|\| getPixelColor\(this\.content\.getContext\('2d'\), bgX \* this\.outputScale, bgY \* this\.outputScale\);"

new_logic = """        // [KISS Optimization] 安全边缘背景采样机制 (Safe Edge Background Sampling)：彻底摒弃中心点取色，改为提取左上角包围盒外部 2px 处的绝对纸张像素，彻底规避文字墨迹造成的黑底污染。
        let bgX = textPart.bounds ? textPart.bounds.left - 2 : x - 2;
        let bgY = textPart.bounds ? textPart.bounds.top - 2 : y - 2;
        let bgColor = elDiv.getAttribute('data-bgcolor') || getPixelColor(this.content.getContext('2d'), Math.max(0, bgX) * this.outputScale, Math.max(0, bgY) * this.outputScale);"""

import re
content = re.sub(old_logic, new_logic, content)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
