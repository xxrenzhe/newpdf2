with open("packages/pdfeditor/src/css/editor.css", "r") as f:
    content = f.read()

replacement = """div[contenteditable] {
    outline: none;
    word-break: normal;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}"""

import re
content = re.sub(r'div\[contenteditable\] \{\n    outline: none;\n    word-wrap: break-word;\n    overflow-wrap: break-word;\n    word-break: break-word;\n    white-space: pre-wrap;\n\}', replacement, content)

with open("packages/pdfeditor/src/css/editor.css", "w") as f:
    f.write(content)
