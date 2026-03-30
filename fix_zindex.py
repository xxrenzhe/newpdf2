import re
with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# We need to find where rect is defined and set zIndex
old_block = r"""                const rect = elDiv.getBoundingClientRect\(\);
                textWidth \+= rect.width;"""

new_block = """                const rect = elDiv.getBoundingClientRect();
                textWidth += rect.width;
                // [KISS Optimization] 智能 Z-Index 碰撞体积优化：按面积反比分配 z-index，保证短文本/内联文本不会被大文本框遮挡而无法点击
                const area = rect.width * rect.height;
                const zIndex = Math.max(1, Math.floor(1000000 / (area || 1)));
                elDiv.style.zIndex = zIndex;"""

content = re.sub(old_block, new_block, content)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
