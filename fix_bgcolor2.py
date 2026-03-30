with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# Make sure we don't rely only on the first character's x,y to pick the whole line's background. 
# We should take the center of the bounding box.
old_logic = r"let bgColor = elDiv\.getAttribute\('data-bgcolor'\) \|\| getPixelColor\(this\.content\.getContext\('2d'\), x \* this\.outputScale, y \* this\.outputScale\);"

new_logic = """        // [KISS Optimization] 优化背景取色的精准度：采用段落包围盒的中心点提取背景色，防止只取首字母边缘引发透明黑底 (Ghosting Background)
        let bgX = x + (textPart.bounds ? (textPart.bounds.right - textPart.bounds.left) / 2 : 0);
        let bgY = y + (textPart.bounds ? (textPart.bounds.bottom - textPart.bounds.top) / 2 : 0);
        let bgColor = elDiv.getAttribute('data-bgcolor') || getPixelColor(this.content.getContext('2d'), bgX * this.outputScale, bgY * this.outputScale);"""

import re
content = re.sub(old_logic, new_logic, content)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
