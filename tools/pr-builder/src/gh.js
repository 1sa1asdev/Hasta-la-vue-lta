/**
 * gh.js — everything that talks to the GitHub CLI.
 *
 * The goal is that a user runs one command (`npm run pr`), answers the
 * questions, and ends up with a real pull request. `gh pr create` does the
 * actual work; this module makes it reliable:
 *
 *  - `findGh()`       detects whether gh exists at all, so we can tell the user
 *                     how to install it instead of dying with ENOENT.
 *  - `pushBranch()`   `gh pr create` fails on a branch that was never pushed
 *                     ("you must first push the current branch"). We check for
 *                     an upstream and offer to push, because that is the step
 *                     everybody forgets.
 *  - `createPullRequest()` runs gh and pulls the PR URL out of its output.
 *
 * The argv-building is a pure function so it can be unit tested without gh
 * being installed at all.
 */

import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { git } from './git.js';

/** The real GitHub CLI prints `gh version 2.x.y (...)` and nothing else. */
const GH_VERSION = /^gh version (\d+\.\d+\.\d+)/m;

/**
 * Run a command and normalise the result (never throws on a non-zero exit).
 *
 * `interactive` inherits stdin so that the tools we wrap can still prompt —
 * git credential helpers, an SSH passphrase, `gh`'s own device flow. Probing
 * (`--version`, `auth status`) deliberately does not.
 *
 * `input` pipes text into the command's stdin, which is how the body reaches
 * `gh pr create --body-file -` when the user did not want a file on disk.
 */
export function run(command, args, cwd, { interactive = false, input } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    input,
    stdio:
      input !== undefined
        ? ['pipe', 'pipe', 'pipe']
        : interactive
          ? ['inherit', 'pipe', 'pipe']
          : ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status ?? null,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
    error: result.error ?? null,
  };
}

/**
 * Every executable named `name` on PATH, in PATH order.
 *
 * This exists because of a genuinely nasty failure mode: there is an npm
 * package called `gh` (the abandoned "node-gh") that is *not* the GitHub CLI.
 * `npm install gh` puts it in `node_modules/.bin/gh`, and npm prepends
 * `node_modules/.bin` to PATH for every `npm run` script — so inside
 * `npm run pr`, a plain `gh` lookup finds the wrong program.
 */
export function findOnPath(name) {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const found = [];
  for (const dir of dirs) {
    const candidate = path.join(dir, name);
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        accessSync(candidate, constants.X_OK);
        if (!found.includes(candidate)) found.push(candidate);
      }
    } catch {
      // Not executable / not a file: not a candidate.
    }
  }
  return found;
}

/**
 * Locate the GitHub CLI and prove it is the GitHub CLI.
 *
 * We do not simply trust the first `gh` on PATH: we walk every candidate and
 * pick the first one that answers `--version` like the real thing. That way an
 * accidental `npm install gh` cannot hijack the tool.
 */
export function findGh() {
  const candidates = findOnPath('gh');
  const rejected = [];

  for (const candidate of candidates) {
    const result = run(candidate, ['--version']);
    const match = result.ok ? result.stdout.match(GH_VERSION) : null;
    if (match) {
      return { available: true, path: candidate, version: `gh ${match[1]}`, rejected, reason: null };
    }
    rejected.push({ path: candidate, output: (result.stdout || result.stderr).split('\n')[0] });
  }

  return {
    available: false,
    path: null,
    version: null,
    rejected,
    // A `gh` exists but is not the GitHub CLI, versus nothing at all.
    reason: candidates.length > 0 ? 'wrong-package' : 'not-installed',
  };
}

/** `gh auth status` exits non-zero when nobody is signed in. */
export function checkAuth(cwd, ghPath = 'gh') {
  const result = run(ghPath, ['auth', 'status'], cwd);
  return { ok: result.ok, message: result.stderr || result.stdout };
}

/**
 * The exact argv handed to `gh pr create`. Pure on purpose.
 *
 * `--title` + `--body-file` are what we always pass: with both present, gh
 * creates the pull request immediately instead of opening an editor, which is
 * the difference between "prompt, then done" and "prompt, then finish by hand".
 */
export function buildCreateArgs({ title, bodyFile, base, draft = false, reviewers = [] }) {
  const args = ['pr', 'create', '--title', title || '...', '--body-file', bodyFile];
  if (base) args.push('--base', base);
  if (draft) args.push('--draft');
  for (const reviewer of reviewers) args.push('--reviewer', reviewer);
  return args;
}

/** gh prints the new pull request URL on stdout. */
export function parsePullRequestUrl(text) {
  const match = String(text ?? '').match(/https:\/\/[^\s]+\/pull\/\d+/);
  return match ? match[0] : null;
}

export function createPullRequest({ cwd, ghPath = 'gh', stdinBody, ...options }) {
  const args = buildCreateArgs(options);
  // With no body file we hand the markdown to gh on stdin (`--body-file -`),
  // so "print the body instead of saving it" still ends in a real pull request.
  const result = run(ghPath, args, cwd, {
    input: stdinBody,
    interactive: stdinBody === undefined,
  });
  return {
    ...result,
    args,
    url: parsePullRequestUrl(result.stdout) ?? parsePullRequestUrl(result.stderr),
  };
}

export function hasUpstream(cwd) {
  return Boolean(git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], cwd));
}

export function pushBranch({ cwd, branch, remote = 'origin' }) {
  return run('git', ['push', '--set-upstream', remote, branch], cwd, { interactive: true });
}
