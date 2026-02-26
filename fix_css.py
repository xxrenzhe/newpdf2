file = "packages/pdfeditor/src/css/editor.css"
with open(file, "r") as f:
    content = f.read()

content = content.replace("word-break: break-all;", "word-break: break-all;\n    white-space: pre-wrap;")

with open(file, "w") as f:
    f.write(content)
