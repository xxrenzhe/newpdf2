file = "packages/pdfeditor/src/editor/element/TextElement.js"
with open(file, "r") as f:
    content = f.read()

content = content.replace("this.el.style.width = nextWidth + 'px';", "if (this.dataType !== 'textbox') { this.el.style.width = nextWidth + 'px'; }")

with open(file, "w") as f:
    f.write(content)
