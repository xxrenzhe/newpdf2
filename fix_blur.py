import re
with open("packages/pdfeditor/src/editor/index.js", "r") as f:
    content = f.read()

replacement = """        PDFEvent.on(Events.TOOLBAR_ITEM_BLUR, e => {
            document.body.classList.remove('pdf-drawing-mode');
"""

content = content.replace("        PDFEvent.on(Events.TOOLBAR_ITEM_BLUR, e => {\n", replacement)

with open("packages/pdfeditor/src/editor/index.js", "w") as f:
    f.write(content)
