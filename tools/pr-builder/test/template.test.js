/**
 * Tests run on the *real* template file from this repository — if someone
 * edits the template in a way this tool cannot understand, the suite fails
 * before a PR is ever written.
 *
 * `node --test` is built into Node, so there is nothing to install.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTemplate, planPrompts, render } from '../src/template.js';
import { answersFromFile } from '../src/answers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const templatePath = path.join(repoRoot, '.github', 'pull_request_template.md');

const markdown = await readFile(templatePath, 'utf8');

test('parses the real template into the expected sections, in order', () => {
  const nodes = parseTemplate(markdown);
  const headings = nodes.filter((n) => n.type === 'heading').map((n) => n.title);

  assert.deepEqual(headings, ['Description', 'Motivation', 'Changes', 'Testing', 'Checklist']);
});

test('uses template comments as the question for their section', () => {
  const nodes = parseTemplate(markdown);
  const headings = nodes.filter((n) => n.type === 'heading');

  assert.equal(headings[0].hint, 'What does this PR change?');
  assert.equal(headings[3].hint, 'How to test it?');
  // Comments are consumed as hints, not kept as loose comment nodes.
  assert.equal(nodes.filter((n) => n.type === 'comment').length, 0);
});

test('groups prompts under the right section', () => {
  const plan = planPrompts(parseTemplate(markdown));
  const byTitle = Object.fromEntries(plan.map((s) => [s.heading.title, s.prompts.map((p) => p.kind)]));

  // Changes: hint + empty bullets are merged into a single list question.
  assert.deepEqual(byTitle.Changes, ['list']);
  assert.equal(plan.find((s) => s.heading.title === 'Changes').prompts[0].question, 'What changes did you make?');
  // Testing keeps its prose question *and* its checklist.
  assert.deepEqual(byTitle.Testing, ['text', 'checklist']);
  assert.deepEqual(byTitle.Checklist, ['checklist']);
});

test('checklist items keep their template default', () => {
  const plan = planPrompts(parseTemplate(markdown));
  const checklist = plan.find((s) => s.heading.title === 'Checklist').prompts[0];

  assert.deepEqual(
    checklist.node.items.map((item) => item.text),
    [
      'Code follows our project conventions',
      'No unnecessary changes included',
      'Documentation updated if necessary',
    ],
  );
  assert.equal(checklist.node.items.every((item) => item.checked === false), true);
});

test('render fills answers, ticks boxes and drops the hint comments', () => {
  const nodes = parseTemplate(markdown);
  const plan = planPrompts(nodes);
  const listIndex = plan.find((s) => s.heading.title === 'Changes').prompts[0].index;
  const testingIndex = plan.find((s) => s.heading.title === 'Testing').prompts[1].index;

  const body = render(nodes, {
    [listIndex]: ['Add search endpoint', 'Document the endpoint'],
    [testingIndex]: [true, true],
  });

  assert.match(body, /^## Description/m);
  assert.match(body, /## Changes\n\n- Add search endpoint\n- Document the endpoint/);
  assert.match(body, /- \[x\] Tests added\/updated/);
  assert.match(body, /- \[ \] Code follows our project conventions/);
  assert.doesNotMatch(body, /<!--/, 'hint comments are prompts, not output');
  assert.doesNotMatch(body, /\n{3,}/, 'spacing is normalised');
  assert.equal(body.endsWith('\n'), true);
});

test('render keeps template order and headings even with no answers', () => {
  const nodes = parseTemplate(markdown);
  const body = render(nodes, {});

  const headings = body.match(/^## .+$/gm);
  assert.deepEqual(headings, ['## Description', '## Motivation', '## Changes', '## Testing', '## Checklist']);
  assert.doesNotMatch(body, /^\s*-\s*$/m, 'empty placeholder bullets are gone');
});

test('--keep-comments puts the hints back', () => {
  const body = render(parseTemplate(markdown), {}, { keepComments: true });
  assert.match(body, /<!-- What does this PR change\? -->/);
});

test('answer files map by section title, with string/array shorthands', () => {
  const plan = planPrompts(parseTemplate(markdown));
  const { answers, missing } = answersFromFile(plan, {
    sections: {
      Description: 'Adds guide search.',
      changes: ['Add search box'],
      Testing: { checks: { 'Tests pass locally': true } },
    },
  });

  const sections = Object.fromEntries(plan.map((s) => [s.heading.title, s]));
  assert.equal(answers[sections.Description.prompts[0].index], 'Adds guide search.');
  assert.deepEqual(answers[sections.Changes.prompts[0].index], ['Add search box']);
  // Unlisted checklist items keep the template default instead of breaking.
  assert.deepEqual(answers[sections.Testing.prompts[1].index], [false, true]);
  assert.deepEqual(missing.sort(), ['Checklist', 'Motivation']);
});

test('a hand-written template with different sections also works', () => {
  const custom = [
    '# Pull request',
    '',
    '### Summary',
    '<!-- Describe it -->',
    '',
    '-',
    '',
    '### Screenshots',
    '',
    '- [x] Attached',
  ].join('\n');

  const nodes = parseTemplate(custom);
  const plan = planPrompts(nodes);
  const body = render(nodes, { [plan[0].prompts[0].index]: ['Did a thing'] });

  assert.equal(plan.length, 2);
  assert.match(body, /### Summary\n\n- Did a thing/);
  assert.match(body, /- \[x\] Attached/);
});
