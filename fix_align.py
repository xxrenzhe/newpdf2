import re
with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

replacement = """                // [KISS Optimization] 智能 Z-Index 碰撞体积优化与热区扩展：保证微小符号、注音、标点符号容易被点击选中
                const MIN_HITBOX = 16;
                const hitWidth = Math.max(rect.width, MIN_HITBOX);
                const hitHeight = Math.max(rect.height, MIN_HITBOX);
                const area = hitWidth * hitHeight;
                const zIndex = Math.max(1, Math.floor(1000000 / (area || 1)));
                elDiv.style.zIndex = zIndex;
                // Extend hit box invisibly for small fragments
                if (rect.width < MIN_HITBOX || rect.height < MIN_HITBOX) {
                    elDiv.style.padding = '4px';
                    elDiv.style.margin = '-4px';
                }

                if (wrapperRect) {"""

old_block = r"""                const MIN_HITBOX = 16;.*?if \(wrapperRect\) \{"""
content = re.sub(old_block, replacement, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
