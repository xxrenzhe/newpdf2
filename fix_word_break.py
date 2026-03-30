with open("packages/pdfeditor/src/css/editor.css", "r") as f:
    content = f.read()

# [KISS Optimization] 修正英文单词在编辑框内无脑强行折断的排版问题
replacement = """div[contenteditable] {
    outline: none;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: pre-wrap;
}"""

import re
content = re.sub(r'div\[contenteditable\] \{\n    outline: none;\n    word-wrap: break-word;\n    word-break: break-all;\n    white-space: pre-wrap;\n\}', replacement, content)

with open("packages/pdfeditor/src/css/editor.css", "w") as f:
    f.write(content)
