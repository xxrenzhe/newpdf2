import os

files = [
    "packages/pdfeditor/src/editor/element/TextElement.js",
    "packages/pdfeditor/src/editor/element/TextBoxElement.js"
]

for file in files:
    with open(file, "r") as f:
        content = f.read()
    
    content = content.replace(
        "this.elText.style.textDecoration = 'underline #ff0000';",
        "this.elText.style.textDecoration = 'underline ' + (this.attrs.color || '');"
    )
    content = content.replace(
        "this.elText.style.textDecoration = 'line-through #ff0000';",
        "this.elText.style.textDecoration = 'line-through ' + (this.attrs.color || '');"
    )

    with open(file, "w") as f:
        f.write(content)
