# PDF Editor Oldcode Parity Design

Date: 2026-02-03

## Goal
Restore the PDF editor experience to oldcode parity by making text conversion predictable, defaulting to text edit mode, and improving font fidelity via server-side font subsetting.

## Scope
- Revert text line grouping and conversion flow to oldcode behavior for all modes.
- Use PDF font names as `fontFile` and fetch subset glyphs from `https://genfont.qwerpdf.com/`.
- Default tool to Text on reader init.
- Keep iframe integration and message protocol unchanged.

## Architecture
The editor remains embedded via `packages/pdfeditor` and integrated by the host app. The core changes are limited to the PDF editor package:
- Reader (`packages/pdfeditor/src/reader/page.js`) uses the oldcode line-splitting algorithm (hasEOL + height/color changes) to build stable text parts.
- Editor (`packages/pdfeditor/src/editor/index.js` and element classes) mirrors oldcode conversion and default tool behavior.
- Font pipeline (`packages/pdfeditor/src/font.js`, `packages/pdfeditor/src/editor/document.js`) returns to server-side subsetting keyed by PDF font name.

## Core Behavior Changes
1) Text grouping and conversion
- After text layer render, group text items into parts using `hasEOL` and height/color differences.
- On click, convert the clicked text part into a Text element with original font metadata.
- Hide original glyphs using the existing hide/clear mechanism.

2) Font fidelity
- `Font.fetchFont()` posts `text` + `fontFile` to `https://genfont.qwerpdf.com/` and caches the buffer.
- `PDFDocument.getFont()` embeds the returned subset or falls back to `StandardFonts.Helvetica` on failure.
- Text elements keep the PDF font name as `fontFile`.

3) Default tool
- On reader init, always activate the Text tool (oldcode behavior), regardless of stability mode.

## Data Flow
- PDF.js renders text layer and exposes `textContentItems`.
- Reader groups items into `textParts` and binds click handlers to convert.
- Conversion dispatches `Events.CONVERT_TO_ELEMENT` and activates the text tool for editing.
- On export, `fixFontData()` aggregates text per page and font file, pre-fetches subsets, then saves.

## Error Handling
- Font fetch failures trigger `Events.ERROR` and fall back to standard PDF-lib fonts.
- Download flow remains unchanged to keep host messaging stable.

## Performance Notes
- Removing extra heuristics reduces text-layer processing overhead.
- Font requests are cached by `(pageId, fontFile)`.

## Testing
- Unit tests for `Font.fetchFont()` and `PDFDocument.getFont()` to verify server subsetting and fallback behavior.
- Unit tests for text grouping and conversion flow (hasEOL + height/color rules) in `PDFPage`.
- Minimal e2e: open PDF, click text, edit, download, and verify `pdf-download` message.

## Rollout
No feature flag; changes apply to all modes to match oldcode behavior.
