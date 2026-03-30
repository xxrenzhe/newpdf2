with open("packages/pdfeditor/src/editor/index.js", "r") as f:
    content = f.read()

replacement = """        PDFEvent.on(Events.TOOLBAR_ITEM_BLUR, e => {
            document.body.classList.remove('pdf-drawing-mode');
            toolActive?.classList.remove('active');
            toolActive = null;
            // elSliderHide(this.pdfElActionsWrapper, 'show');
            if (e.data.name == 'forms') {
                if (this.btnFormsSlider.classList.contains('active')) {
                    this.btnFormsSlider.click();
                }
            }
        });

        // [KISS Optimization] 降低心智负担：全局 Esc 取消焦点与 Delete 删除元素快捷键支持
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur();
                }
                if (this.pdfDocument && this.pdfDocument.pages) {
                    this.pdfDocument.pages.forEach(p => p.elements.activeId = null);
                }
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === document.body) {
                if (this.pdfDocument && this.pdfDocument.pages) {
                    this.pdfDocument.pages.forEach(p => {
                        const activeId = p.elements.activeId;
                        if (activeId && p.elements.get(activeId)) {
                            p.elements.remove(activeId);
                            p.elements.activeId = null;
                        }
                    });
                }
            }
        });
    }

    // toggleElActions() {"""

import re
content = re.sub(r'        PDFEvent\.on\(Events\.TOOLBAR_ITEM_BLUR, e => \{.*?        \}\);\n    \}\n\n    // toggleElActions\(\) \{', replacement, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/editor/index.js", "w") as f:
    f.write(content)
