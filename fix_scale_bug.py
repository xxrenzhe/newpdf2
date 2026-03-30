import re

for file in [
    "packages/pdfeditor/src/editor/toolbar/text_highlight/index.js",
    "packages/pdfeditor/src/editor/toolbar/underline/index.js",
    "packages/pdfeditor/src/editor/toolbar/strikethrough/index.js"
]:
    with open(file, "r") as f:
        content = f.read()

    # Re-measure coordinates right before save
    old_rect = r"""                const rect = \{
                    x: parseFloat\(el\.getAttribute\('data-x'\)\),
                    y: parseFloat\(el\.getAttribute\('data-y'\)\),
                    width: parseFloat\(el\.getAttribute\('data-w'\)\),
                    height: parseFloat\(el\.getAttribute\('data-h'\)\)
                \};

                const pageId = el\.getAttribute\('data-pageid'\);
                const page = this\.editor\.pdfDocument\.getPageForId\(pageId\);"""

    new_rect = """                const pageId = el.getAttribute('data-pageid');
                const page = this.editor.pdfDocument.getPageForId(pageId);
                // [KISS Optimization] 动态提取实时物理坐标，彻底免疫缩放级别的变化导致标注偏移
                const domRect = el.getBoundingClientRect();
                const mainRect = page.readerPage.elWrapper.getBoundingClientRect();
                const rect = {
                    x: domRect.x - mainRect.x,
                    y: domRect.y - mainRect.y,
                    width: domRect.width,
                    height: domRect.height
                };"""

    content = re.sub(old_rect, new_rect, content)

    with open(file, "w") as f:
        f.write(content)

