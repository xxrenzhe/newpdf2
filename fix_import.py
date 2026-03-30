import re
with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

content = content.replace(
    "import { getTextRotation, shouldBreakTextRun } from './text_layout.js';",
    "import { getTextRotation, shouldBreakTextRun, getRunReadGap, isVerticalTextRun } from './text_layout.js';"
)

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
