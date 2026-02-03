# Editable Text Detection - Balanced Stability and Accuracy

Date: 2026-02-03
Owner: Jason Yu / Codex
Status: Approved (Balanced strategy)

## Goals
- Improve editable text detection accuracy using height, color, spacing, and table-line cues.
- Produce reliable editable text box boundaries and cover rects for redaction/export.
- Preserve vertical text as vertical (do not mis-detect as horizontal).
- Keep performance stable and avoid regressions in common PDFs.

## Non-Goals
- Full re-architecture or heavy clustering (e.g., DBSCAN).
- High-cost image analysis across entire pages.
- Perfect detection for all scanned or noisy documents.

## Context
Current pipeline lives in `packages/pdfeditor/src/reader/page.js`:
- PDF.js text items -> renderTextLayer -> line break heuristics -> merge parts -> compute bounds -> convertWidget.
- Recent changes added visual line breaks, gap splitting, cover rects, PDF metric bounds, and canvas refinements.
Oldcode reference (`oldcode/pdfeditor/src/reader/page.js`):
- Simpler break logic (height, color, hasEOL) and robust pixel-based color fallback.

## Strategy: Balanced (Stable + High-Confidence Enhancements)
- Keep current baseline as default.
- Apply new logic only when confidence is high.
- Add guardrails to prevent over-splitting.
- Fail fast and fall back to old logic when data is missing.

## Proposed Enhancements (High-Level)
1. **Metrics extraction** (lightweight):
   - For each text item, compute position, size, color, rotation, and direction.
   - Normalize color for comparison.
   - Track transform-based rotation and `style.vertical`.

2. **Orientation-aware grouping**:
   - Separate horizontal vs vertical items early.
   - Vertical items follow a vertical path (sort by x, then y) and keep rotation.

3. **Break decision with confidence gating**:
   - Hard breaks: direction mismatch, large rotation delta, hasEOL, or table-line crossing.
   - Soft score: height consistency, color consistency, spacing ratio, and left-reset signals.
   - New breaks only when `confidence >= threshold`.

4. **Boundary computation**:
   - Use item boxes from PDF metrics where available.
   - Apply `#applyPdfLineWidth` to extend to true glyph width.
   - If no cover rects, refine right bound using canvas sampling.

5. **Table-line constraint**:
   - Detect thin horizontal/vertical lines near candidate bounds using sparse sampling.
   - If a boundary crosses a detected line, split cover rects, not text content.

6. **Guardrails**:
   - Max splits per line (2-3).
   - Minimum segment width and minimum non-space characters.
   - If guardrails fail, revert to single box.

## Key Data Structures
- `TextItemMetrics`:
  - `x, y, width, height, color, rotation, isVertical, fontSize`.
- `LineCandidate`:
  - `items, bounds, confidence, isVertical, coverRects`.
- `TableLineMap`:
  - Arrays of horizontal/vertical segments (pixel space).

## Confidence Model (Example)
- `score = w1*height + w2*color + w3*spacing + w4*alignment - w5*rotationPenalty`.
- Threshold for applying new logic: `score >= 0.7` (tunable).
- If unknown values, reduce score and prefer baseline.

## Vertical Text Handling
- Any `style.vertical` or rotation near 90/270 goes into vertical grouping.
- Use vertical line break rules (x delta and y reset).
- Preserve rotation in editor element and mark `textMode: vertical` (or equivalent).

## Error Handling and Fallbacks
- Missing transforms, styles, or canvas read -> fallback to baseline logic.
- Table-line detection failures -> ignore and continue.
- If metrics are inconsistent, keep single line and single box.

## Performance Considerations
- Cache metrics per page and invalidate on zoom/rotation.
- Limit table-line sampling to candidate line neighborhoods.
- Use coarse sampling step (e.g., 4px or 6px).

## Integration Points
- `#isBreak`: add confidence gate and orientation checks.
- `#buildCoverRects`: incorporate table-line constraints (split cover rects only).
- `#getTextItemBox`: ensure rotation handling and vertical measurement.
- `convertWidget`: preserve rotation and vertical mode; keep background/cover logic.

## Testing Plan
- Unit tests for:
  - Break decisions (height/color/spacing combos).
  - Vertical text detection and isolation.
  - Cover rect splitting when table line is detected.
- Visual regression fixtures:
  - Multi-column with large gaps.
  - Table-heavy PDF with thin grid lines.
  - Vertical CJK layout.

## Risks and Mitigations
- Performance regressions: mitigate with caching and sparse sampling.
- Over-splitting: mitigate with guardrails and confidence gate.
- Under-detection: preserve baseline behavior as default.

