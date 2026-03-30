with open("packages/pdfeditor/src/editor/element/TextBoxElement.js", "r") as f:
    content = f.read()

import re

# In TextBoxElement, when text overflows, we want it to automatically adjust height.
replacement = """    #autoHeight() {
        if (!this.el || !this.elText) {
            return;
        }
        // [KISS Optimization] TextBox 智能动态尺寸反馈：当内容溢出时自动向下撑高，防止遮挡，保留原定宽度
        this.elText.style.height = 'auto';
        const height = Math.ceil(this.elText.scrollHeight || 0);
        const minHeight = Math.ceil((this.attrs.lineHeight || this.attrs.size || 0) * this.pageScale) || 1;
        const nextHeight = Math.max(height, minHeight);
        
        if (Number.isFinite(nextHeight) && nextHeight > 0) {
            this.el.style.height = nextHeight + 'px';
            this.elText.style.height = '100%';
            this.attrs.height = nextHeight / this.pageScale;
        }
        this.setActualRect();
    }"""

content = re.sub(r'    #autoHeight\(\) \{.*?\}', replacement, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/editor/element/TextBoxElement.js", "w") as f:
    f.write(content)
