import re
with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# [KISS Optimization] Ensure extremely small texts (formulas, punctuations) are easily recognized as clickable
replacement = """                // [KISS Optimization] 智能 Z-Index 碰撞体积优化与热区扩展：保证微小符号、注音、标点符号容易被点击选中
                const MIN_HITBOX = 16;
                const hitWidth = Math.max(rect.width, MIN_HITBOX);
                const hitHeight = Math.max(rect.height, MIN_HITBOX);
                const area = hitWidth * hitHeight;
                const zIndex = Math.max(1, Math.floor(1000000 / (area || 1)));
                elDiv.style.zIndex = zIndex;
                if (rect.width < MIN_HITBOX || rect.height < MIN_HITBOX) {
                    elDiv.style.padding = '4px'; // Extend hit box invisibly
                    elDiv.style.margin = '-4px'; // Offset padding to preserve visual alignment
                }

                if (wrapperRect) {"""

old_block = r"""                const area = rect\.width \* rect\.height;
                const zIndex = Math\.max\(1, Math\.floor\(1000000 / \(area \|\| 1\)\)\);
                elDiv\.style\.zIndex = zIndex;
                if \(wrapperRect\) \{"""

content = re.sub(old_block, replacement, content)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
