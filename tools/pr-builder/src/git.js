/**
 * git.js — pull just enough context out of the repository to give the user
 * good defaults. Nothing here is required: outside a git repo (or with
 * `--no-git`) every function returns null/empty and the CLI still works.
 *
 * Every git call is best-effort on purpose. A missing remote, a fresh repo
 * with no commits, or an angry git config should never stop someone from
 * writing a PR description.
 */

import { execFileSync } from 'node:child_process';

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export { git };

/** Absolute path of the git directory (works for worktrees too). */
export function gitDir(cwd) {
  const out = git(['rev-parse', '--path-format=absolute', '--git-dir'], cwd);
  return out || null;
}

/**
 * Guess the branch this work should be merged into. In a Gitflow setup
 * (which this repo uses) that is usually `development`; `main` is the release
 * branch. We prefer the remote-tracking branch so the diff is always against
 * what the reviewer will actually see.
 */
export function baseBranch(cwd) {
  for (const candidate of ['origin/development', 'origin/main', 'development', 'main']) {
    if (git(['rev-parse', '--verify', '--quiet', candidate], cwd)) return candidate;
  }
  return null;
}

/** `feat/tech-debt` -> `feat: tech debt`, so the title field is pre-filled. */
export function titleFromBranch(branch) {
  if (!branch || ['main', 'master', 'development', 'dev', 'HEAD'].includes(branch)) return '';

  const knownTypes = ['feat', 'fix', 'hotfix', 'docs', 'chore', 'refactor', 'test', 'style', 'perf'];
  const [maybeType, ...rest] = branch.split('/');
  const hasType = knownTypes.includes(maybeType);
  const slug = (hasType ? rest.join('/') : branch).replace(/[-_]+/g, ' ').trim();
  if (!slug) return '';
  return hasType ? `${maybeType}: ${slug}` : slug;
}

/**
 * Everything the CLI wants to know about the current work, or null when we are
 * not inside a repository.
 */
export function collectContext(cwd) {
  if (!git(['rev-parse', '--is-inside-work-tree'], cwd)) return null;

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const base = baseBranch(cwd);
  const range = base ? `${base}...HEAD` : 'HEAD';

  // `--no-merges` keeps "Merge branch 'development'" noise out of the list.
  const commits = (
    git(['log', '--no-merges', '--pretty=format:%s', range], cwd) ?? ''
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const files = (git(['diff', '--name-only', range], cwd) ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return { branch, base, commits, files, titleSuggestion: titleFromBranch(branch) };
}
