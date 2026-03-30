import re
with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# [KISS Optimization] 既然我们在底层的 text_layout 允许跨行合并了，上层的 textItem.hasEOL 就不能直接一刀切触发 break。
# 只让 `this.#isBreak(textItem, i+1)` 掌管最终截断，或者将 hasEOL 转换为真实的文本换行符 "\n"，而不是截断成两个编辑框。
new_logic = """
                if (textItem.hasEOL) {
                    text += '\\n';
                }
                
                if (this.#isBreak(textItem, i+1)) {
"""

old_logic = """
                if (textItem.hasEOL || this.#isBreak(textItem, i+1)) {"""

content = content.replace(old_logic, new_logic)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
