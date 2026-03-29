import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrustedOrigin,
  hasHealthCheckTimedOut,
  matchesEditorSessionId,
  matchesLoadToken,
  matchesRequestId,
  parseEditorMessage,
  shouldPauseHealthChecks,
} from '../pdfEditorProtocol.ts';

const PDF_BLOB = new Blob(['pdf'], { type: 'application/pdf' });

test('parseEditorMessage parses session and request metadata', () => {
  const message = parseEditorMessage({
    type: 'pdf-download',
    blob: PDF_BLOB,
    editorSessionId: 'session-1',
    requestId: 'request-1',
  });

  assert.deepEqual(message, {
    type: 'pdf-download',
    blob: PDF_BLOB,
    editorSessionId: 'session-1',
    requestId: 'request-1',
  });
});

test('parseEditorMessage parses font fallback warning payload', () => {
  const message = parseEditorMessage({
    type: 'pdf-font-fallback',
    count: 2,
    fonts: ['CustomFontA', 'CustomFontB'],
    editorSessionId: 'session-font',
    requestId: 'request-font',
  });

  assert.deepEqual(message, {
    type: 'pdf-font-fallback',
    count: 2,
    fonts: ['CustomFontA', 'CustomFontB'],
    editorSessionId: 'session-font',
    requestId: 'request-font',
  });
});

test('parseEditorMessage rejects malformed messages', () => {
  assert.equal(parseEditorMessage({ type: 'pdf-download', requestId: 'x' }), null);
  assert.equal(parseEditorMessage({ type: 'pdf-progress', loaded: '10' }), null);
  assert.equal(parseEditorMessage({ type: 'unknown' }), null);
});

test('session, request, and load token match helpers are strict', () => {
  assert.equal(matchesEditorSessionId('a', 'a'), true);
  assert.equal(matchesEditorSessionId(undefined, 'a'), false);

  assert.equal(matchesRequestId('req-1', 'req-1'), true);
  assert.equal(matchesRequestId(undefined, 'req-1'), false);
  assert.equal(matchesRequestId('req-1', null), false);

  assert.equal(matchesLoadToken(undefined, 7), true);
  assert.equal(matchesLoadToken(7, 7), true);
  assert.equal(matchesLoadToken(8, 7), false);
});

test('buildTrustedOrigin resolves same-origin iframe URLs', () => {
  assert.equal(
    buildTrustedOrigin('/pdfeditor/index.html?lang=en', 'https://example.com/tools/edit'),
    'https://example.com'
  );
  assert.equal(buildTrustedOrigin('https://cdn.example.com/embed', 'https://example.com/tools/edit'), 'https://cdn.example.com');
  assert.equal(buildTrustedOrigin('::::', 'https://example.com/tools/edit'), 'https://example.com');
});

test('health check helpers model pause and timeout behavior', () => {
  assert.equal(shouldPauseHealthChecks('hidden', false), true);
  assert.equal(shouldPauseHealthChecks('visible', true), true);
  assert.equal(shouldPauseHealthChecks('visible', false), false);

  assert.equal(hasHealthCheckTimedOut(1000, 21000, 20000), true);
  assert.equal(hasHealthCheckTimedOut(1000, 20999, 20000), false);
});
