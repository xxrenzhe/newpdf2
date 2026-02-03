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
