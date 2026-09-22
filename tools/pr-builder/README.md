# pr-builder

An interactive CLI that reads `.github/pull_request_template.md`, asks you about
each section, and then **creates the pull request for you** with `gh pr create`.
One command in, a real pull request out.

It has **zero dependencies** — just Node's standard library — so there is
nothing to install, nothing to keep updated, and nothing to explain to a
reviewer.

```bash
npm run pr
```

## What a run looks like

```
pr-builder · template .github/pull_request_template.md
  Diffing against origin/development (on feat/tech-debt)
PR title (feat: tech debt) › feat: add guide search

## Description

What does this PR change?
  Finish with a line containing only "." — leave it empty to skip.
  › Adds a search field to the guides page and filters results by title.
  › .

## Changes

Detected from git:
  • Add search endpoint
  • Wire the search field into GuidesView
Use these as the list? [Y/n] y

## Testing

How to test it?
  › Run npm run dev, open /guides, type "fjäll".
  › .
  Tests added/updated [y/N] y
  Tests pass locally [y/N] y

## Checklist
  Code follows our project conventions [y/N] y
  No unnecessary changes included [y/N] y
  Documentation updated if necessary [y/N] n

✔ Wrote .git/PR_BODY.md (23 lines)

Create the pull request
  "feat/guide-search" is not on the remote yet. Push it to origin? [Y/n]
  ✔ Pushed feat/guide-search
  Create the pull request into development? [Y/n]
  ✔ https://github.com/1sa1asdev/Hasta-la-vue-lta/pull/42
```

Three things are worth noticing in that transcript:

- The questions are **not** hard-coded. They are the HTML comments from your
  template, so the wording stays owned by whoever edits the template.
- Every heading, every checkbox and the section order come from the template
  file. The output looks conventional even if the user answers sloppily.
- The body is written to `<git-dir>/PR_BODY.md` — inside `.git/`, so it is never
  committed, never staged, and never shows up in `git status` — and then handed
  to `gh pr create`, so there is no copy/paste step.

## Creating the pull request

The last two steps are the ones people get wrong, so the tool does them for you
and asks first:

1. **Push.** `gh pr create` fails with *"you must first push the current
   branch"* on a branch that has no upstream. We detect that and offer
   `git push --set-upstream origin <branch>`.
2. **Create.** `gh pr create --title ... --body-file .git/PR_BODY.md --base
   development`. Passing both `--title` and `--body-file` means gh creates the
   pull request immediately instead of opening an editor.

The target branch is detected from the repo (Gitflow-aware: `origin/development`
first, then `origin/main`) and can be overridden with `--base`. Nothing is
pushed or created without a confirmation, unless you pass `-y` to auto-accept.

**Prerequisites:** the GitHub CLI, signed in.

```bash
brew install gh
gh auth login
```

Careful: `npm install gh` is **not** the GitHub CLI — that is an unrelated
package (`node-gh`, last released years ago) that writes to `~/.gh.json`. Since
npm puts `node_modules/.bin` first on PATH for every `npm run` script, an
accidental install of it would otherwise hijack the tool. `findGh()` therefore
probes every `gh` on your PATH with `--version` and only accepts the one that
answers like the real CLI, skipping impostors with a warning.

If gh is missing it is not a dead end — the tool prints the exact
`gh pr create …` command plus the manual "Compare & pull request" route. To skip
the GitHub side entirely:

```bash
npm run pr -- --no-create --out -    # just build the body and print it
```

### Making `gh pr create` itself run this

If you would rather keep the muscle memory, this shell function intercepts only
`gh pr create` and hands everything else to the real gh. Add it to `~/.zshrc`;
`command gh pr create` still reaches the normal GitHub flow.

```zsh
gh() {
  if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
    npm run pr --silent
  else
    command gh "$@"
  fi
}
```

## How it works

The whole tool is a five-step pipeline. Each step is one small module, and the
data shape passed between them is the contract.

```
 .github/pull_request_template.md
        │
        │  1. parseTemplate()               src/template.js
        ▼
   nodes[]        heading | checklist | bullets | text | comment
        │
        │  2. planPrompts()                 src/template.js
        ▼
   sections[]  →  { heading, prompts: [{ index, kind: 'text'|'list'|'checklist' }] }
        │
        │  3. ask the user                  src/prompts.js
        │     (git.js supplies defaults, answers.js can replace this step)
        ▼
   answers       { [nodeIndex]: string | string[] | boolean[] }
        │
        │  4. render(nodes, answers)        src/template.js
        ▼
   PR body markdown  →  .git/PR_BODY.md
        │
        │  5. push (if needed) + create     src/gh.js
        ▼
   gh pr create --title ... --body-file ... --base development  →  pull request URL
```

### 1. `parseTemplate(markdown)` — the template is the spec

We do not use a markdown library. A PR template is a small, predictable dialect,
so the parser is a line loop with a handful of regexes and it handles exactly the
patterns templates actually use:

| In the template | Becomes | What the CLI does with it |
| --- | --- | --- |
| `## Description` | `heading` | Emits the heading; order is preserved |
| `<!-- What does this PR change? -->` right under a heading | the heading's `hint` | Used verbatim as the question |
| `<!-- ... -->` anywhere else | `comment` | Swallowed (it was an instruction to a human) |
| `- [ ] Tests pass locally` | `checklist` item | Yes/no question; `- [x]` pre-ticks it |
| a bare `-` placeholder | `bullets` | "One item per line", becomes real bullets |
| any other line | `text` | Copied through untouched |

Two deliberate choices:

- **Node index is identity.** Answers are stored as `{ [nodeIndex]: answer }`.
  Rendering is then just "walk the template, look up the answer". There is no
  section-name matching, no schema, no migration when a heading is renamed.
- **The parser is strict about intent, loose about formatting.** A comment
  directly after a heading is a question; the same comment after a paragraph is
  a note. Trailing whitespace and `-` vs `- ` normalise away, and blank lines are
  re-generated by the renderer, which is why output spacing is uniform.

### 2. `planPrompts(nodes)` — decide what to ask

Prompts are grouped under the heading they appear in, so the CLI can work
section by section and an answer file can be keyed by section title.

One case is worth spelling out, because it is the difference between a tool you
want to use and one you do not. `## Changes` in your template has *both* a
question ("What changes did you make?") and three empty bullets. That is one
request expressed twice, so the hint is promoted to be the question for the list
and the separate prose prompt is dropped — you type the list once. A hint
followed by **checkboxes** (`## Testing`) is not merged, because there the prose
is real content that sits next to the checklist.

### 3. Asking — `src/prompts.js`, `src/git.js`

`prompts.js` wraps `node:readline` and exposes four verbs: `ask` (one line, with
a default), `multiline` (prose, terminated by a line containing only `.`), `list`
(one bullet per line) and `confirm` (yes/no, default on Enter).

The interesting part is **line queueing**. The obvious implementation is
`rl.question()` per prompt, and it breaks as soon as input is piped:
readline emits every buffered line as soon as it reads it, so any line that
arrives while no question is pending is silently thrown away. Instead we keep a
queue of lines, hand them out as questions are asked, and resolve to `null` once
stdin ends. That one decision makes `printf '...' | npm run pr` behave exactly
like a human typing, which is also what makes the test suite possible.

`git.js` is best-effort context, never a requirement:

| Helper | Used for |
| --- | --- |
| `baseBranch()` | Prefers `origin/development`, then `origin/main` — Gitflow-aware |
| `collectContext()` | Commit subjects from `base...HEAD`, offered as the change list |
| `titleFromBranch()` | `feat/guide-search` → suggested title `feat: guide search` |
| `gitDir()` | Where the default output file goes |

Outside a repo, or with `--no-git`, every one of these returns empty and the tool
still works.

### 4. `render(nodes, answers)` — put it back together

Rendering is a switch over node types. Headings are always emitted (so structure
survives an empty or skipped section), checkboxes are re-emitted with `[x]` where
the answer was yes, and the whole thing is joined with single blank lines. Because
nothing is invented at render time, the output can never drift from the template.

## Options

| Flag | Effect |
| --- | --- |
| `-t, --template <path>` | Use a specific template file |
| `-o, --out <path>` | Save the body there; `-` prints it instead of saving it (the body is piped to gh on stdin) |
| `-a, --answers <path>` | Read answers from JSON instead of asking (non-interactive) |
| `--title <text>` | Skip the title question |
| `--base <branch>` | Target branch (default: detected, e.g. `development`) |
| `--reviewer <handle>` | Request a review; repeat the flag for several people |
| `--draft` | Open the pull request as a draft |
| `--no-create` | Only write the body, do not call `gh pr create` |
| `--no-push` | Assume the branch is already pushed |
| `--keep-comments` | Keep the `<!-- hints -->` in the generated body |
| `--no-git` | Ignore git context entirely |
| `-y, --yes` | Auto-accept the push and create confirmations (for scripts) |
| `-p, --print` | Also print the body to stdout |

### Answer files

Useful for demos, CI or scripting. Keys are section titles as they appear in the
template; a string is shorthand for `{ "text": ... }` and an array for
`{ "list": [...] }`. Unlisted checklist items keep the template default.

```json
{
  "title": "feat: add guide search",
  "sections": {
    "Description": "Adds a search field to the guides page.",
    "Motivation": { "text": "Guides were hard to find at scale." },
    "Changes": { "list": ["Add search input", "Filter guides by title"] },
    "Testing": { "checks": { "Tests pass locally": true } }
  }
}
```

```bash
npm run pr -- --answers answers.json --out -   # print, do not write
```

## Files

| File | Responsibility |
| --- | --- |
| `src/template.js` | Parse the template into nodes; plan prompts; render the body. Pure functions. |
| `src/prompts.js` | Interactive questions (readline, queueing, multiline, yes/no). |
| `src/git.js` | Best-effort git context: base branch, commits, title suggestion, git dir. |
| `src/gh.js` | GitHub CLI integration: detect gh, check auth, push the branch, create the PR, parse its URL. |
| `src/answers.js` | Map an answer-file JSON onto the parsed template. |
| `src/cli.js` | Flag parsing, the flow, confirmation, file writing, next-step hints. |
| `test/template.test.js` | Unit tests that run against the *real* template file. |
| `test/gh.test.js` | Unit tests for the `gh pr create` argv and URL parsing (no gh needed). |

`tools/` is intentionally not an npm workspace: the tool needs no dependencies,
so it should not be pulled into `npm install` or the api/web build.

## Tests

```bash
npm run pr:test          # from the repo root
node --test tools/pr-builder/test
```

The suite parses the real `.github/pull_request_template.md`, so if someone edits
the template into a shape the CLI cannot understand, the tests fail *before* a
pull request is ever written. There is also a hand-written template in the tests
to prove the parser is not secretly specialised to this repo. The `gh`
integration is tested through its pure parts (argv building, URL parsing), so
the suite passes on a machine where gh is not installed.

## Extending it

Small, well-scoped additions — each one plugs into a single place:

- **Another question type** (numbered steps, a release-notes list): add a regex
  and a node kind in `parseTemplate()`, a `kind` in `planPrompts()`, a branch in
  the asking loop in `cli.js`, and a `case` in `render()`.
- **Labels and assignees.** `--reviewer`, `--base` and `--draft` are already
  wired through `buildCreateArgs()` in `src/gh.js`; add `--label` / `--assignee`
  there and in `OPTIONS` in `cli.js`. Encoding "PRs target `development`, at
  least one reviewer" from the working agreements is a natural next step.
- **Validate answers** (e.g. require a Motivation for `feat:` branches) by
  looping in the asking loop until the answer passes.

## Known limitations

- Multi-line HTML comments are read but treated as a single-line hint.
- Only one template is used; GitHub's `?template=` query parameter has no effect.
- The answer file keys on section titles, so two sections with the same title
  answer together.
- Nesting is preserved as-is (`###` inside `##` renders fine), but prompts are
  grouped by the nearest preceding heading, not by a tree.
