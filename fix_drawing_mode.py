import re
with open("packages/pdfeditor/src/editor/index.js", "r") as f:
    content = f.read()

replacement = """        const showActions = e => {
            // [KISS Optimization] 隔离绘图模式的文本误触
            if (['mouse', 'hand', 'text'].indexOf(e.data.name) === -1) {
                document.body.classList.add('pdf-drawing-mode');
            } else {
                document.body.classList.remove('pdf-drawing-mode');
            }
"""

content = content.replace("        const showActions = e => {\n", replacement)

with open("packages/pdfeditor/src/editor/index.js", "w") as f:
    f.write(content)
