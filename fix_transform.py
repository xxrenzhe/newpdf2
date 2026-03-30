with open("packages/pdfeditor/src/editor/element/TextElement.js", "r") as f:
    content = f.read()

content = content.replace("            this.elText.style.transform = 'rotate('+ this.attrs.rotate +'deg)';", "            this.elText.style.transform = 'rotate('+ this.attrs.rotate +'deg)';\n            this.elText.style.transformOrigin = 'left top';")

with open("packages/pdfeditor/src/editor/element/TextElement.js", "w") as f:
    f.write(content)
