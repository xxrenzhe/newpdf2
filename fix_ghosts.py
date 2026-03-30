import re

for file in [
    "packages/pdfeditor/src/editor/toolbar/underline/index.js",
    "packages/pdfeditor/src/editor/toolbar/strikethrough/index.js"
]:
    with open(file, "r") as f:
        content = f.read()

    replacement = """            });
        });

        // [KISS Optimization] 彻底清除文本标注保存时的图层污染
        PDFEvent.on(Events.SAVE_AFTER, e => {
            this.editor.pdfDocument.pages.forEach(page => {
                let toRemove = [];
                for (let key in page.elements.items) {
                    if (page.elements.items[key].options?.source === 'text_markup_export') {
                        toRemove.push(key);
                    }
                }
                toRemove.forEach(id => page.elements.remove(id));
            });
        });
    }"""

    content = re.sub(r'            \}\);\n        \}\);\n    \}', replacement, content)

    # Modify the element addition to include an identifier
    add_replacement = """                page.elements.add('rect', {
                    width: rect.width,
                    height: thickness,
                    opacity: this.attrs.opacity,
                    background: this.attrs.background
                }, {
                    source: 'text_markup_export',
                    pos: {
                        x: rect.x,
                        y: rect.y
                    }
                });"""
    content = re.sub(r"                page\.elements\.add\('rect', \{\n                    width: rect\.width,\n                    height: thickness,\n                    opacity: this\.attrs\.opacity,\n                    background: this\.attrs\.background\n                \}, \{\n                    pos: \{\n                        x: rect\.x,\n                        y: rect\.y\n                    \}\n                \}\);", add_replacement, content)

    with open(file, "w") as f:
        f.write(content)

