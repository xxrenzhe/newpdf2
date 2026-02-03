# AssemblePDF True Text Deletion Design

Date: 2026-02-03

## Goal
Ensure deleted text is removed from PDF content streams so it is no longer copyable in the exported PDF.

## Scope
- Add AssemblePDF support to the clean pdfjs-dist v2 worker (no obfuscation, no external redirects).
- Track string byte positions while parsing text operators and emit them in `textContentItem.subStrList`.
- Implement AssemblePDF handler to surgically delete bytes from `/Contents` and XObject streams.
- Keep existing UI cover/redaction behavior as a fallback when AssemblePDF is unavailable.

## Architecture
The feature is implemented entirely inside the PDF.js worker and the existing editor export pipeline:
- Parser/Lexer: record `startPos`, `endPos`, and `isHex` for string tokens as they are read.
- Evaluator/Preprocessor: propagate those positions into `buildTextContentItem` and emit a `subStrList` entry with `{ str, glyphs, startPos, endPos, isHex, xobjName }`.
- Worker: register a new `AssemblePDF` message handler that accepts `{ chars }`, iterates per page, and removes byte ranges from the target stream (page `/Contents` or `/Resources` `/XObject`).
- Export: `flushData()` continues to call `sendWithPromise('AssemblePDF')` when the worker advertises support, otherwise it falls back to `reader.getData()`.

## Data Flow
1) User deletes text in the editor -> reader collects `clearTexts` with `subStrList` metadata.
2) `flushData()` detects AssemblePDF support and sends `{ chars }` to the worker.
3) Worker maps each `subStrList` entry to a byte range in the content stream or XObject stream.
4) Worker rebuilds the stream bytes with those ranges removed and updates stream length.
5) Worker returns a new `Uint8Array` PDF; editor loads it via `setDocumentProxy()`.

## Error Handling
- If a `subStrList` entry is missing positions, out of range, or the stream/XObject is missing, skip that entry and log a warning.
- If AssemblePDF throws or times out, fall back to `reader.getData()` with a console warning.
- Avoid any network redirects or external references in the worker code.

## Testing
- Script: export a PDF after deleting text and re-parse with pdf.js; confirm deleted text is absent from extracted text.
- Content-stream inspection: compare before/after content stream bytes to confirm the deletion range is removed.
- UI manual: delete text -> download -> copy at original location; deleted text should not be copyable.
- Worker self-check: ensure `pdf.worker.min.js` includes the `AssemblePDF` string so `#supportsAssemblePDF()` passes.

## Rollout
No new feature flag. Uses existing `assemblePDF` option in auto mode and defaults to fallback behavior if AssemblePDF is unavailable.
