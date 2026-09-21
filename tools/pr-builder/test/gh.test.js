/**
 * The GitHub CLI integration is tested through its pure parts: how we build the
 * `gh pr create` argv and how we read the pull request URL back out. That means
 * the suite passes on a machine where gh is not even installed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildCreateArgs, findGh, findOnPath, parsePullRequestUrl } from '../src/gh.js';

/** Create a throwaway executable so PATH lookups can be tested for real. */
function writeFakeGh(dir, output, exitCode = 0) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'gh');
  writeFileSync(file, `#!/bin/sh\necho "${output}"\nexit ${exitCode}\n`);
  chmodSync(file, 0o755);
  return file;
}

function withPath(entries, fn) {
  const original = process.env.PATH;
  process.env.PATH = entries.join(path.delimiter);
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

test('always pins title and body file, so gh never opens an editor', () => {
  const args = buildCreateArgs({ title: 'feat: add search', bodyFile: '.git/PR_BODY.md' });

  assert.deepEqual(args, [
    'pr',
    'create',
    '--title',
    'feat: add search',
    '--body-file',
    '.git/PR_BODY.md',
  ]);
});

test('adds base, draft and reviewers only when they are requested', () => {
  const plain = buildCreateArgs({ title: 't', bodyFile: 'b' });
  assert.equal(plain.includes('--base'), false);
  assert.equal(plain.includes('--draft'), false);

  const full = buildCreateArgs({
    title: 't',
    bodyFile: 'b',
    base: 'development',
    draft: true,
    reviewers: ['marcus', 'isaias'],
  });
  assert.deepEqual(full, [
    'pr',
    'create',
    '--title',
    't',
    '--body-file',
    'b',
    '--base',
    'development',
    '--draft',
    '--reviewer',
    'marcus',
    '--reviewer',
    'isaias',
  ]);
});

test('falls back to a placeholder title rather than creating an untitled PR', () => {
  const args = buildCreateArgs({ title: '', bodyFile: 'b' });
  assert.equal(args[args.indexOf('--title') + 1], '...');
});

test('extracts the pull request URL from gh output', () => {
  assert.equal(
    parsePullRequestUrl('Creating pull request for pr-builder into development\n\nhttps://github.com/1sa1asdev/Hasta-la-vue-lta/pull/42\n'),
    'https://github.com/1sa1asdev/Hasta-la-vue-lta/pull/42',
  );
  assert.equal(parsePullRequestUrl('something went wrong'), null);
  assert.equal(parsePullRequestUrl(undefined), null);
});

test('findOnPath returns every match, in PATH order', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'pr-builder-'));
  const first = writeFakeGh(path.join(root, 'a'), '1');
  const second = writeFakeGh(path.join(root, 'b'), '2');

  withPath([path.join(root, 'a'), path.join(root, 'b')], () => {
    assert.deepEqual(findOnPath('gh'), [first, second]);
  });
});

/**
 * The trap this guards against: `npm install gh` installs an unrelated npm
 * package, npm puts node_modules/.bin first on PATH, and a naive lookup would
 * happily run the wrong program.
 */
test('skips a gh that is not the GitHub CLI and uses the real one behind it', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'pr-builder-'));
  const impostor = writeFakeGh(path.join(root, 'node_modules-bin'), '2.8.9');
  const real = writeFakeGh(path.join(root, 'usr-local-bin'), 'gh version 2.62.0 (2025-01-01)');

  withPath([path.join(root, 'node_modules-bin'), path.join(root, 'usr-local-bin')], () => {
    const gh = findGh();
    assert.equal(gh.available, true);
    assert.equal(gh.path, real);
    assert.equal(gh.version, 'gh 2.62.0');
    assert.deepEqual(gh.rejected, [{ path: impostor, output: '2.8.9' }]);
  });
});

test('reports wrong-package when only the npm impostor exists', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'pr-builder-'));
  const impostor = writeFakeGh(path.join(root, 'node_modules-bin'), '2.8.9');

  withPath([path.join(root, 'node_modules-bin')], () => {
    const gh = findGh();
    assert.equal(gh.available, false);
    assert.equal(gh.reason, 'wrong-package');
    assert.equal(gh.rejected[0].path, impostor);
  });
});

test('reports not-installed when there is no gh at all', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'pr-builder-'));
  mkdirSync(path.join(root, 'empty'), { recursive: true });

  withPath([path.join(root, 'empty')], () => {
    const gh = findGh();
    assert.equal(gh.available, false);
    assert.equal(gh.reason, 'not-installed');
    assert.deepEqual(gh.rejected, []);
  });
});
