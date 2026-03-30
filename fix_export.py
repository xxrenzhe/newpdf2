import re
with open("packages/pdfeditor/src/reader/text_layout.js", "r") as f:
    content = f.read()

content = content.replace("const getRunReadGap =", "export const getRunReadGap =")

with open("packages/pdfeditor/src/reader/text_layout.js", "w") as f:
    f.write(content)
