with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

import re

# [KISS Optimization] 精准继承原生行高，防止进入编辑状态时文本框发生纵向偏移跳动
content = re.sub(
    r"lineHeight: null,",
    r"lineHeight: (textPart.bounds ? (textPart.bounds.bottom - textPart.bounds.top) : fontSize) / this.scale,",
    content
)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
