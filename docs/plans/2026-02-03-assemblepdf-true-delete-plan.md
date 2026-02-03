# AssemblePDF True Text Deletion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make deleted text truly removed from PDF content streams so it is no longer copyable after export.

**Architecture:** Replace the bundled PDF.js v2 worker with a clean build that includes AssemblePDF and string-position tracking. Extend Lexer/Parser/Evaluator inside the worker to emit `subStrList` (start/end byte positions + hex flag). Add an AssemblePDF handler in the worker that removes those byte ranges from page `/Contents` or XObject streams and returns new PDF bytes.

**Tech Stack:** PDF.js v2 worker (`pdfjs-dist-v2`), Node.js tests (`node:test`), existing PDF editor export path.

---

### Task 1: Add a failing worker-capability test

**Files:**
- Create: `packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

**Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = resolve(
  __dirname,
  '../../assets/js/pdfjs/pdf.worker.min.js'
);

test('worker advertises AssemblePDF support', async () => {
  const text = await readFile(workerPath, 'utf8');
  assert.ok(text.includes('AssemblePDF'), 'worker missing AssemblePDF handler');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

Expected: FAIL with `worker missing AssemblePDF handler`

**Step 3: (No implementation yet)**

**Step 4: (Run again after worker changes in later tasks)**

**Step 5: Commit**

Defer commit until Task 5 when all worker changes are done.

---

### Task 2: Replace worker with clean base (no obfuscation)

**Files:**
- Modify: `packages/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js`

**Step 1: Write the failing test**

(Already written in Task 1)

**Step 2: Run test to verify it fails**

(Already failing)

**Step 3: Write minimal implementation**

1) Ensure deps exist: `npm install` (for `pdfjs-dist-v2`).
2) Replace worker with clean base:

```bash
cp node_modules/pdfjs-dist-v2/build/pdf.worker.js \
  packages/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js
```

This keeps the filename but swaps in a clean, readable worker.

**Step 4: Run test to verify it still fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

Expected: still FAIL (AssemblePDF not added yet).

**Step 5: Commit**

Defer commit until Task 5.

---

### Task 3: Track string byte positions in Lexer/Parser

**Files:**
- Modify: `packages/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js`

**Step 1: Write the failing test**

(Reuse Task 1 test; still failing until AssemblePDF is added.)

**Step 2: Run test to verify it fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

**Step 3: Write minimal implementation**

In the worker file, locate `class Lexer` and `class Parser` (unminified after Task 2). Add position tracking:

```js
// Inside Lexer constructor
this._stringStart = -1;
this._stringEnd = -1;
this._stringIsHex = false;

getString() {
  // record start BEFORE consuming
  this._stringStart = this.stream.pos;
  this._stringIsHex = false;
  // existing string parsing logic...
  const str = /* existing parsing result */;
  // record end AFTER consuming
  this._stringEnd = this.stream.pos;
  return str;
}

getHexString() {
  this._stringStart = this.stream.pos;
  this._stringIsHex = true;
  const str = /* existing hex parsing result */;
  this._stringEnd = this.stream.pos;
  return str;
}

getStartPos() {
  return this._stringStart;
}

getEndPos() {
  return this._stringEnd;
}

getIsHexString() {
  return this._stringIsHex;
}
```

In `class Parser`, add buffer position fields and update them when reading string tokens:

```js
// Inside Parser constructor
this.buf1StartPos = -1;
this.buf1EndPos = -1;
this.buf1IsHexStr = false;
this.buf2StartPos = -1;
this.buf2EndPos = -1;
this.buf2IsHexStr = false;

// When buffer 1 is filled
if (this.buf1 instanceof StringStreamToken) {
  this.buf1StartPos = this.lexer.getStartPos();
  this.buf1EndPos = this.lexer.getEndPos();
  this.buf1IsHexStr = this.lexer.getIsHexString();
}

// When buffer 2 is filled
if (this.buf2 instanceof StringStreamToken) {
  this.buf2StartPos = this.lexer.getStartPos();
  this.buf2EndPos = this.lexer.getEndPos();
  this.buf2IsHexStr = this.lexer.getIsHexString();
}

getStartPos() { return this.buf1StartPos; }
getEndPos() { return this.buf1EndPos; }
getIsHexStr() { return this.buf1IsHexStr; }
```

(Use the worker’s real string token class name; in pdf.js it is commonly `StringStream` or `StringStreamToken`. Match existing code.)

**Step 4: Run test to verify it still fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

Expected: still FAIL (AssemblePDF not added yet).

**Step 5: Commit**

Defer commit until Task 5.

---

### Task 4: Emit `subStrList` in text content items

**Files:**
- Modify: `packages/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js`

**Step 1: Write the failing test**

(Reuse Task 1 test.)

**Step 2: Run test to verify it fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

**Step 3: Write minimal implementation**

In `EvaluatorPreprocessor.read`, capture string argument positions from the parser and expose them on the preprocessor instance:

```js
// When reading args, after pushing a string arg
if (typeof arg === 'string') {
  this.argsStartPos[i] = this.parser.getStartPos();
  this.argsEndPos[i] = this.parser.getEndPos();
  this.argsIsHexStr[i] = this.parser.getIsHexStr();
}
```

In `PartialEvaluator` (or equivalent text-content builder), pass these positions into `buildTextContentItem` and emit `subStrList`:

```js
function buildTextContentItem({ str, glyphs, startPos, endPos, isHex, xobjName }) {
  // existing item creation...
  item.subStrList ||= [];
  item.subStrList.push({
    str,
    glyphs,
    startPos,
    endPos,
    isHex,
    xobjName: xobjName || null
  });
  return item;
}
```

Update all text operators to pass positions (e.g., `showText`, `showSpacedText`, `nextLineShowText`, `nextLineSetSpacingShowText`). Use `preprocessor.argsStartPos/EndPos/IsHexStr` and the current XObject name if available.

**Step 4: Run test to verify it still fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

Expected: still FAIL (AssemblePDF not added yet).

**Step 5: Commit**

Defer commit until Task 5.

---

### Task 5: Add AssemblePDF handler in worker

**Files:**
- Modify: `packages/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js`

**Step 1: Write the failing test**

(Reuse Task 1 test.)

**Step 2: Run test to verify it fails**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

**Step 3: Write minimal implementation**

Add a handler to `WorkerMessageHandler.createDocumentHandler`:

```js
handler.on('AssemblePDF', async ({ chars, outType }) => {
  const pdfManager = await ensureDoc('pdfManager');
  const xref = await ensureDoc('xref');
  const catalog = await ensureDoc('catalog');

  const bytes = await assemblePdfBytes({
    pdfManager,
    xref,
    catalog,
    chars
  });

  return outType === 'Uint8Array' ? bytes : bytes.buffer;
});
```

Implement `assemblePdfBytes` and helpers (based on old worker, but clean):

```js
function removeByteRanges(bytes, ranges) {
  const toRemove = new Set();
  for (const { start, end } of ranges) {
    for (let i = start; i < end; i++) toRemove.add(i);
  }
  const out = new Uint8Array(bytes.length - toRemove.size);
  let o = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (!toRemove.has(i)) out[o++] = bytes[i];
  }
  return out;
}

async function assemblePdfBytes({ pdfManager, xref, catalog, chars }) {
  // Iterate pages; for each page index gather `subStrList` ranges
  // Remove ranges from /Contents or XObject stream bytes
  // Update stream length and return new PDF bytes via pdfManager
}
```

Key behaviors:
- If `xobjName` exists, resolve `/Resources` → `/XObject` → that name and edit that stream.
- If `/Contents` is an array of streams, map ranges to the right stream by position.
- Skip invalid ranges or missing streams with `warn` and continue.

**Step 4: Run test to verify it passes**

Run: `node --test packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js \
  packages/pdfeditor/src/reader/__tests__/assemblepdf_worker.test.mjs

git commit -m "feat: add AssemblePDF worker support"
```

---

### Task 6: Manual verification

**Files:**
- None (manual)

**Step 1: Run manual repro**

1) Open a PDF in the editor
2) Delete a line of text
3) Download the edited PDF
4) Copy the same area in a PDF viewer

**Expected:** deleted text is not copyable.

---

## Notes
- If needed, use `oldcode/pdfeditor/src/assets/js/pdfjs/pdf.worker.min.js` as reference for the AssemblePDF algorithm and subStrList handling, but do not copy any redirect/obfuscated logic.
- Keep `pdf.worker.min.js` readable even if unminified; correctness is more important than size.
