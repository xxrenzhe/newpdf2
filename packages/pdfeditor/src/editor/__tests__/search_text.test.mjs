import test from 'node:test';
import assert from 'node:assert/strict';
import { countTextMatches, replaceTextMatches } from '../../search_text.js';

test('countTextMatches supports case sensitivity and CJK content', () => {
    assert.equal(countTextMatches('Alpha alpha ALPHA', 'alpha', false), 3);
    assert.equal(countTextMatches('Alpha alpha ALPHA', 'alpha', true), 1);
    assert.equal(countTextMatches('中文替换中文', '中文', false), 2);
});

test('replaceTextMatches replaces first or all matches without regex side effects', () => {
    assert.deepEqual(
        replaceTextMatches('foo foo', 'foo', 'bar', {
            replaceAll: false
        }),
        {
            text: 'bar foo',
            count: 1
        }
    );

    assert.deepEqual(
        replaceTextMatches('foo.foo', 'foo.', 'bar', {
            replaceAll: true
        }),
        {
            text: 'barfoo',
            count: 1
        }
    );

    assert.deepEqual(
        replaceTextMatches('中文测试中文', '中文', '已替换', {
            replaceAll: true
        }),
        {
            text: '已替换测试已替换',
            count: 2
        }
    );
});
