import re
with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# Make sure we don't accidentally hide the underlying text wrapper to width=1 height=1 because of GC. 
# Also we should optimize small text elements being hard to click
replacement = """                // [KISS Optimization] 扩大微小文字或符号的点击热区 (Hitbox padding)
                const MIN_HITBOX = 16;
                const hitWidth = Math.max(rect.width, MIN_HITBOX);
                const hitHeight = Math.max(rect.height, MIN_HITBOX);
                const area = hitWidth * hitHeight;
                const zIndex = Math.max(1, Math.floor(1000000 / (area || 1)));
                elDiv.style.zIndex = zIndex;
                if (rect.width < MIN_HITBOX || rect.height < MIN_HITBOX) {
                    elDiv.style.minWidth = MIN_HITBOX + 'px';
                    elDiv.style.minHeight = MIN_HITBOX + 'px';
                    elDiv.style.display = 'flex';
                    elDiv.style.alignItems = 'center';
                    elDiv.style.justifyContent = 'center';
                }

                if (wrapperRect) {"""

old_block = r"""                const area = rect\.width \* rect\.height;
                const zIndex = Math\.max\(1, Math\.floor\(1000000 / \(area \|\| 1\)\)\);
                elDiv\.style\.zIndex = zIndex;
                if \(wrapperRect\) \{"""

content = re.sub(old_block, replacement, content)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
