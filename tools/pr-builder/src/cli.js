#!/usr/bin/env node
/**
 * cli.js — the flow: find template -> parse -> ask -> render -> write.
 *
 * Usage:
 *   npm run pr                            # interactive, from the repo root
 *   npm run pr -- --out -                 # print the body instead of writing
 *   npm run pr -- --answers answers.json  # non-interactive
 *   npm run pr -- --help
 */

import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { parseTemplate, planPrompts, render } from './template.js';
import { answersFromFile } from './answers.js';
import { createPrompter } from './prompts.js';
import { collectContext, gitDir } from './git.js';
import { buildCreateArgs, createPullRequest, checkAuth, findGh, hasUpstream, pushBranch } from './gh.js';

/**
 * Where a PR template may live. GitHub itself accepts several spellings, so we
 * check the ones that actually exist in the wild, in order of precedence.
 * We walk upwards from the current directory, which means the tool works from
 * a nested folder (`api/src`) as well as from the root.
 */
const TEMPLATE_CANDIDATES = [
  '.github/pull_request_template.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/pull_request_template/PULL_REQUEST_TEMPLATE.md',
  '.github/PULL_REQUEST_TEMPLATE/PULL_REQUEST_TEMPLATE.md',
  'pull_request_template.md',
  'PULL_REQUEST_TEMPLATE.md',
  'docs/pull_request_template.md',
];

const OPTIONS = {
  template: { type: 'string', short: 't' },
  out: { type: 'string', short: 'o' },
  answers: { type: 'string', short: 'a' },
  title: { type: 'string' },
  base: { type: 'string' },
  reviewer: { type: 'string', multiple: true },
  draft: { type: 'boolean' },
  'no-create': { type: 'boolean' },
  'no-push': { type: 'boolean' },
  'keep-comments': { type: 'boolean' },
  'no-git': { type: 'boolean' },
  yes: { type: 'boolean', short: 'y' },
  print: { type: 'boolean', short: 'p' },
  help: { type: 'boolean', short: 'h' },
};

const HELP = `
pr-builder — answer a few questions, get a pull request

Usage
  npm run pr [options]

Fill in the team's pull request template interactively, then create the pull
request with the GitHub CLI. Use --no-create if you only want the body.

Options
  -t, --template <path>   Use a specific template file
  -o, --out <path>        Where to write the body ("-" prints to stdout only)
  -a, --answers <path>    Read answers from JSON instead of asking
      --title <text>      Skip the title question
      --base <branch>     Target branch for the pull request (default: detected)
      --reviewer <handle> Request a review; repeat the flag for several people
      --draft             Open the pull request as a draft
      --no-create         Only write the body, do not call gh pr create
      --no-push           Assume the branch is already pushed
      --keep-comments     Keep <!-- hints --> in the generated body
      --no-git            Ignore git context (no commit suggestions)
  -y, --yes               Do not ask for a final confirmation
  -p, --print             Also print the body to stdout
  -h, --help              Show this help

By default the body is written to <git-dir>/PR_BODY.md, which is inside .git/
and therefore never committed or accidentally staged.
`.trim();

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\u001b[${code}m${text}\u001b[0m` : text);
const bold = (text) => paint('1', text);
const dim = (text) => paint('2', text);
const green = (text) => paint('32', text);
const red = (text) => paint('31', text);

function findTemplate(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    for (const candidate of TEMPLATE_CANDIDATES) {
      const full = path.join(dir, candidate);
      if (existsSync(full)) return full;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** `tools/pr-builder/src/cli.js` reads better in messages than `../../../../x`. */
function displayPath(from, to) {
  const relative = path.relative(from, to);
  return relative && !relative.startsWith('..') ? relative : to;
}

/** Quote only what needs quoting, so the printed command can be copy-pasted. */
function shellCommand(command, args) {
  const quoted = args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg));
  return [command, ...quoted].join(' ');
}

/**
 * One prompter for the whole session: it owns stdin, and creating a second one
 * halfway through would fight over the same input stream. Created lazily so a
 * non-interactive run (`--answers`, or `-y`) never touches stdin at all.
 */
let prompter = null;
const getPrompter = () => (prompter ??= createPrompter());

async function main() {
  try {
    return await run();
  } finally {
    // Releases stdin, otherwise a half-answered session keeps the process alive.
    prompter?.close();
  }
}

async function run() {
  let flags;
  let extra;
  try {
    ({ values: flags, positionals: extra } = parseArgs({ options: OPTIONS, allowPositionals: true }));
  } catch (error) {
    console.error(red(`✖ ${error.message}`));
    console.error(dim('  Run with --help to see the available options.'));
    return 1;
  }

  if (flags.help) {
    console.log(HELP);
    return 0;
  }
  if (extra.length > 0) {
    console.error(red(`✖ Unexpected argument: ${extra[0]}`));
    return 1;
  }

  const cwd = process.cwd();

  /**
   * `--yes` means "take the default for every remaining decision", which is
   * what makes scripted runs possible. Otherwise the user confirms each step.
   */
  const confirmStep = async (question, defaultValue = true) => {
    if (flags.yes) return defaultValue;
    return getPrompter().confirm(question, { defaultValue });
  };

  // 1) Find and parse the template.
  const templatePath = flags.template ? path.resolve(cwd, flags.template) : findTemplate(cwd);
  if (!templatePath || !existsSync(templatePath)) {
    console.error(red('✖ No pull request template found.'));
    console.error(dim('  Looked for .github/pull_request_template.md in this folder and upwards.'));
    console.error(dim('  Point at one explicitly with --template <path>.'));
    return 1;
  }

  const nodes = parseTemplate(await readFile(templatePath, 'utf8'));
  const plan = planPrompts(nodes);
  console.log(`${bold('pr-builder')} ${dim('·')} template ${dim(displayPath(cwd, templatePath))}`);
  if (plan.length === 0) {
    console.log(dim('  This template has no sections that need answers; the body will be a copy of it.'));
  }

  // 2) Optional git context, used only to pre-fill suggestions.
  const context = flags['no-git'] ? null : collectContext(cwd);

  const answers = {};
  let title = flags.title ?? '';
  let ranOutOfInput = false;

  if (flags.answers) {
    // 3a) Non-interactive: answers come from a JSON file.
    const data = JSON.parse(await readFile(path.resolve(cwd, flags.answers), 'utf8'));
    const mapped = answersFromFile(plan, data);
    Object.assign(answers, mapped.answers);
    title = data.title ?? title ?? context?.titleSuggestion ?? '';
    if (mapped.missing.length > 0) {
      console.log(dim(`  No answers for: ${mapped.missing.join(', ')}`));
    }
  } else {
    // 3b) Interactive: ask section by section, in template order.
    console.log(dim(context?.base ? `  Diffing against ${context.base}${context.branch ? ` (on ${context.branch})` : ''}` : '  No git context available.'));

    title = await getPrompter().ask('PR title', { defaultValue: title || context?.titleSuggestion || undefined });

    for (const section of plan) {
      if (getPrompter().exhausted) {
        ranOutOfInput = true;
        break;
      }
      console.log(`\n${bold(section.heading ? `## ${section.heading.title}` : 'General')}`);

      for (const prompt of section.prompts) {
        if (getPrompter().exhausted) {
          ranOutOfInput = true;
          break;
        }

        if (prompt.kind === 'text') {
          const value = await getPrompter().multiline(prompt.question, {
            hint: 'Finish with a line containing only "." — leave it empty to skip.',
          });
          if (value) answers[prompt.index] = value;
        } else if (prompt.kind === 'list') {
          const items = await getPrompter().list(prompt.question, {
            suggestions: context?.commits ?? [],
          });
          if (items.length > 0) answers[prompt.index] = items;
        } else {
          const checks = [];
          for (const item of prompt.node.items) {
            checks.push(await getPrompter().confirm(`  ${item.text}`, { defaultValue: item.checked }));
          }
          answers[prompt.index] = checks;
        }
      }
    }

    // Being explicit beats writing a half-answered body without saying so.
    if (ranOutOfInput) {
      console.log(dim('\n  Input ended before every section was answered — the rest keep their template defaults.'));
    }
  }

  // 4) Render the body from the template structure plus the answers.
  const body = render(nodes, answers, { keepComments: flags['keep-comments'] });

  if (flags.print || flags.out === '-') {
    console.log(`\n${dim('─── PR body ' + '─'.repeat(50))}`);
    process.stdout.write(body);
    console.log(dim('─'.repeat(61)));
  }

  // 5) Write it somewhere useful.
  let outPath = null;
  if (flags.out && flags.out !== '-') {
    outPath = path.resolve(cwd, flags.out);
  } else if (!flags.out) {
    const dir = gitDir(cwd);
    outPath = dir ? path.join(dir, 'PR_BODY.md') : null;
  }

  if (outPath) {
    const ok = await confirmStep(`\nWrite the PR body to ${displayPath(cwd, outPath)}?`);
    if (!ok) {
      console.log(dim('  Nothing written. The rendered body is above.'));
      return 0;
    }
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, body, 'utf8');
    console.log(`\n${green('✔')} Wrote ${displayPath(cwd, outPath)} (${body.split('\n').length - 1} lines)`);
  } else if (!flags.print && flags.out !== '-') {
    process.stdout.write(body);
  }

  // 6) Create the pull request. This is the point of the whole tool: the user
  //    answers questions and is done, instead of copying a body somewhere.
  console.log(`\n${bold('Create the pull request')}`);

  const relOut = outPath ? path.relative(cwd, outPath) || outPath : null;
  const shownOut = outPath ? displayPath(cwd, outPath) : null;
  const base = flags.base ?? context?.base?.replace(/^origin\//, '') ?? null;
  const branch = context?.branch && context.branch !== 'HEAD' ? context.branch : null;

  /** Everything the user needs if we cannot create the PR for them. */
  const printFallback = () => {
    if (title) console.log(dim(`  Title: ${title}`));
    if (relOut) {
      const ghArgs = buildCreateArgs({
        title,
        bodyFile: relOut,
        base,
        draft: flags.draft,
        reviewers: flags.reviewer ?? [],
      });
      console.log(`  ${shellCommand('gh', ghArgs)}`);
      console.log(dim(`  …or open GitHub → "Compare & pull request" and paste ${shownOut}.`));
    } else {
      console.log('  Copy the body above into the pull request description.');
    }
  };

  // `--no-create`, or an answer body that was never written to disk, means we
  // stop here on purpose.
  if (flags['no-create'] || !relOut) {
    printFallback();
    return 0;
  }

  const gh = findGh();
  if (!gh.available) {
    if (gh.reason === 'wrong-package') {
      console.log(`  ${red('✖')} The only "gh" on your PATH is not the GitHub CLI.`);
      for (const rejected of gh.rejected) {
        console.log(dim(`    ${rejected.path}${rejected.output ? ` — ${rejected.output}` : ''}`));
      }
      console.log(dim('    That is the npm package "gh" (node-gh). Remove it with: npm uninstall gh'));
    } else {
      console.log(`  ${red('✖')} The GitHub CLI (gh) is not installed.`);
    }
    console.log(`    brew install gh     # the real CLI`);
    console.log(`    gh auth login`);
    printFallback();
    return 0;
  }

  // Found the GitHub CLI, but something else claimed the name first — say so,
  // because a surprise like this is worth knowing about.
  for (const rejected of gh.rejected) {
    console.log(`  ${dim(`⚠ Ignoring ${rejected.path} (not the GitHub CLI); using ${gh.path}`)}`);
  }

  // `gh pr create` refuses to run for a branch that has no upstream, and that
  // is the step people forget, so offer it here.
  if (branch && !flags['no-push'] && !hasUpstream(cwd)) {
    const shouldPush = await confirmStep(`  "${branch}" is not on the remote yet. Push it to origin?`);
    if (shouldPush) {
      const pushed = pushBranch({ cwd, branch });
      if (!pushed.ok) {
        console.log(`  ${red('✖')} git push failed:`);
        for (const line of (pushed.stderr || pushed.stdout).split('\n')) console.log(dim(`    ${line}`));
        printFallback();
        return 1;
      }
      console.log(`  ${green('✔')} Pushed ${branch}`);
    }
  }

  const auth = checkAuth(cwd, gh.path);
  if (!auth.ok) {
    // A warning, not a hard stop: `gh auth status` can disagree with reality
    // (tokens via environment variables, for instance), and if we are wrong
    // then `gh pr create` fails with a clear message that we already handle.
    console.log(`  ${red('✖')} gh reports that you are not signed in. Fix it with ${bold('gh auth login')}.`);
    if (auth.message) console.log(dim(`    ${auth.message.split('\n')[0]}`));
    const tryAnyway = await confirmStep('  Try creating the pull request anyway?');
    if (!tryAnyway) {
      printFallback();
      return 1;
    }
  }

  const shouldCreate = await confirmStep(`  Create the pull request${base ? ` into ${base}` : ''}?`);
  if (!shouldCreate) {
    console.log(dim('  Nothing created. The body is written and ready.'));
    printFallback();
    return 0;
  }

  const created = createPullRequest({
    cwd,
    ghPath: gh.path,
    title,
    bodyFile: relOut,
    base,
    draft: flags.draft,
    reviewers: flags.reviewer ?? [],
  });

  if (created.ok) {
    console.log(`  ${green('✔')} ${created.url ?? 'Pull request created'}`);
    if (created.url) console.log(dim(`    gh pr view --web ${created.url}   # open it in the browser`));
    return 0;
  }

  console.log(`  ${red('✖')} gh pr create failed:`);
  for (const line of (created.stderr || created.stdout || 'unknown error').split('\n')) {
    console.log(dim(`    ${line}`));
  }
  printFallback();
  return 1;
}

// Only run when invoked directly, so the module can be imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
