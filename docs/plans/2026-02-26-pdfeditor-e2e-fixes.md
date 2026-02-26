# PDF Editor E2E Test Fixes (2026-02-26)

## Overview

During E2E testing using `chrome-devtools-mcp` and Playwright with the document `public/2222.pdf`, several issues were discovered and fixed to bring the `packages/pdfeditor` code into parity with `oldcode/pdfeditor` regarding text operations, highlighting, erasing, drawing, and signatures.

## Fix Details

### 1. Editable Text Recognition Improvement (Text Block Merging)
- **Issue:** The editor was incorrectly merging distinct text blocks (e.g., text far apart horizontally but on the same Y-axis, such as multi-column layouts) into a single large editable text box.
- **Root Cause:** The text layout algorithm (`packages/pdfeditor/src/reader/text_layout.js`) only considered vertical `height` changes to break lines and completely ignored horizontal gap distances.
- **Fix:** Implemented `hasLargeReadGap` and `getRunReadGap` logic. The system now checks the gap between text items on the reading axis. If the gap exceeds a threshold (`Math.max(8, size * 1.5)`), the text run is explicitly broken, preventing distant text items from being merged.

### 2. UI Display Polish (Hardcoded Text Decorations)
- **Issue:** Applying an "Underline" or "Strikethrough" to text always resulted in a red line (`#ff0000`), regardless of the actual color of the text.
- **Root Cause:** Hardcoded CSS values inside `TextElement.js` and `TextBoxElement.js`.
- **Fix:** Removed the hardcoded red color and updated the `textDecoration` property to dynamically inherit the current text color (`this.attrs.color`), ensuring the decoration matches the text style.

### 3. Functional Fixes (TextBox Width & Whitespace)
- **Issue:**
  1. Text boxes (`TextBoxElement`) would grow infinitely in width instead of wrapping to a new line when typing long content.
  2. Typing multiple consecutive spaces would collapse into a single space in the UI, due to standard HTML whitespace collapsing.
- **Root Cause:**
  1. `TextElement.js` was overriding the width for all text elements, circumventing the custom `#autoHeight` logic intended for `TextBoxElement`.
  2. The `div[contenteditable]` CSS lacked the `white-space` property necessary to preserve spaces.
- **Fix:**
  1. Updated `syncSizeToContent()` in `TextElement.js` to only force width expansion if the `dataType` is not `'textbox'`.
  2. Added `white-space: pre-wrap;` to the `div[contenteditable]` selector in `packages/pdfeditor/src/css/editor.css` to properly preserve and render multiple spaces and line breaks.

## Verified Operations
The following core PDF operations were verified against `public/2222.pdf` and confirmed to be functioning correctly:
- **File Upload & Open**
- **Text Operations:** Add Text, Edit Text, Replace Text, Delete Text, Underline, Strikethrough.
- **Highlighting:** Highlight Text, Highlight Area.
- **Eraser:** Erase Text, Erase Drawing.
- **Drawing:** Freehand Draw.
- **Signature:** Apply Signature.
- **Export:** Save and Download modifications.
