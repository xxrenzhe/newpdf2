with open("packages/pdfeditor/src/editor/element/TextElement.js", "r") as f:
    content = f.read()

replacement = """        const handleFocusLoss = () => {
            if (!this.elText || !this.elText.isConnected) {
                return;
            }
            if (removeIfTextEmpty()) {
                return;
            }
            this.disableDrag = false;
            
            // [KISS Optimization] Fix text selection ghosting issue: 
            // When losing focus, explicitly remove window selection.
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const node = selection.anchorNode;
                if (this.elText.contains(node)) {
                    selection.removeAllRanges();
                }
            }

            this.page.elements.activeId = null;"""

import re
content = re.sub(r'        const handleFocusLoss = \(\) => \{\n.*?            this\.page\.elements\.activeId = null;', replacement, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/editor/element/TextElement.js", "w") as f:
    f.write(content)
