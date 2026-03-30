import re
with open("packages/pdfeditor/src/editor/element/TextBoxElement.js", "r") as f:
    content = f.read()

# Make sure to replace exactly the old #autoHeight method
old_block = r"""    #autoHeight\(\) \{
        let height = Math\.ceil\(this\.elText\.scrollHeight\) \+ 2;
        if \(height > 1000\) \{
            return;
        \}
        if \(height < 32\) \{
            height = 32;
        \}
        this\.el\.style\.height = height \+ 'px';
        this\.attrs\.height = height / this\.pageScale;
        this\.setActualRect\(\);
        this\.dragElement\.plugins\.resizable\.options\.minHeight = height;
    \}"""

new_block = """    #autoHeight() {
        if (!this.el || !this.elText) return;
        // [KISS Optimization] TextBox 智能动态尺寸反馈：当内容溢出时自动向下撑高，保留原定宽度
        this.elText.style.height = 'auto';
        let height = Math.ceil(this.elText.scrollHeight || 0) + 2;
        const minHeight = Math.ceil((this.attrs.lineHeight || this.attrs.size || 0) * this.pageScale) || 1;
        height = Math.max(height, minHeight);
        
        if (Number.isFinite(height) && height > 0) {
            this.el.style.height = height + 'px';
            this.elText.style.height = '100%';
            this.attrs.height = height / this.pageScale;
            this.setActualRect();
            if (this.dragElement && this.dragElement.plugins.resizable) {
                this.dragElement.plugins.resizable.options.minHeight = height;
            }
        }
    }"""

content = re.sub(old_block, new_block, content)

with open("packages/pdfeditor/src/editor/element/TextBoxElement.js", "w") as f:
    f.write(content)
