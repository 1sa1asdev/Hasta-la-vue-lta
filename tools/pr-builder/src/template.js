/**
 * template.js — understand the repository's pull request template.
 *
 * The core idea of this tool: the template file *is* the spec. We do not
 * hard-code "Description / Motivation / Testing" anywhere in the CLI. We read
 * the template, turn it into a small list of nodes, and ask a question for each
 * node that needs input. Edit the template and the CLI follows automatically.
 *
 * Node kinds (and the markdown that produces them):
 *
 *   heading    `## Description`
 *              An HTML comment directly underneath becomes the *question* we
 *              ask for that section (the template author already wrote it).
 *   checklist  `- [ ] Tests pass locally`
 *              A run of checkboxes -> one yes/no question per item.
 *   bullets    `-` (an empty placeholder bullet)
 *              A run of empty bullets -> "write a list, one item per line".
 *   text       any other literal markdown -> copied through untouched.
 *   comment    an HTML comment that is not used as a hint -> swallowed by
 *              default (it was an instruction to the human), optionally kept.
 *
 * We intentionally do not try to be a full markdown parser. We only need to
 * understand the handful of patterns real PR templates use, and pass
 * everything else through byte-for-byte.
 */

const RE_HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const RE_CHECKBOX = /^\s*[-*]\s+\[([ xX])\]\s*(.*?)\s*$/;
const RE_EMPTY_BULLET = /^\s*[-*]\s*$/;
const RE_COMMENT = /^\s*<!--\s*([\s\S]*?)\s*-->\s*$/;

/**
 * Turn template markdown into a flat list of nodes. The array index of a node
 * is its identity: answers are stored as `{ [nodeIndex]: answer }`, which keeps
 * rendering trivial and order-preserving.
 *
 * @param {string} markdown
 * @returns {Array<object>} nodes
 */
export function parseTemplate(markdown) {
  const nodes = [];
  let pendingHeading = null; // heading that may still receive a hint comment

  for (const rawLine of markdown.split(/\r?\n/)) {
    // Trailing whitespace is never meaningful in these templates, and
    // `- ` vs `-` should parse identically, so normalise it away.
    const line = rawLine.replace(/\s+$/, '');

    // Blank lines are not stored. The renderer re-inserts clean spacing, which
    // is why the finished body never contains the double blank line that the
    // template happens to have after `## Changes`.
    if (line === '') continue;

    const comment = line.match(RE_COMMENT);
    if (comment) {
      // A comment that follows a heading (and nothing else yet) is that
      // section's question. Any other comment is just a note to the reader.
      if (pendingHeading && !pendingHeading.hint) {
        pendingHeading.hint = comment[1].split('\n').map((l) => l.trim()).join(' ').trim();
        continue;
      }
      nodes.push({ type: 'comment', text: comment[1].trim() });
      continue;
    }

    const heading = line.match(RE_HEADING);
    if (heading) {
      const node = { type: 'heading', level: heading[1].length, title: heading[2], hint: null };
      nodes.push(node);
      pendingHeading = node;
      continue;
    }

    const checkbox = line.match(RE_CHECKBOX);
    if (checkbox) {
      const item = { text: checkbox[2], checked: checkbox[1].toLowerCase() === 'x' };
      const last = nodes.at(-1);
      if (last?.type === 'checklist') last.items.push(item);
      else nodes.push({ type: 'checklist', items: [item] });
      pendingHeading = null;
      continue;
    }

    if (RE_EMPTY_BULLET.test(line)) {
      const last = nodes.at(-1);
      if (last?.type === 'bullets') last.count += 1;
      else nodes.push({ type: 'bullets', count: 1 });
      pendingHeading = null;
      continue;
    }

    // Anything else is literal markdown. Consecutive lines stick together so a
    // wrapped sentence stays one paragraph; a blank line starts a new node.
    const last = nodes.at(-1);
    if (last?.type === 'text') last.lines.push(line);
    else nodes.push({ type: 'text', lines: [line] });
    pendingHeading = null;
  }

  return nodes;
}

/**
 * Group the promptable nodes under their heading, so the CLI can ask
 * "section by section" and so answer files can be keyed by section title.
 *
 * @param {Array<object>} nodes
 * @returns {Array<{heading: object|null, prompts: Array<object>}>}
 */
export function planPrompts(nodes) {
  /** @type {Array<{heading: object|null, prompts: Array<object>}>} */
  const sections = [];
  let current = null;

  const startSection = () => {
    current = { heading: null, prompts: [] };
    sections.push(current);
    return current;
  };

  nodes.forEach((node, index) => {
    if (node.type === 'heading') {
      current = { heading: node, prompts: [] };
      sections.push(current);
      if (node.hint) {
        current.prompts.push({ index, kind: 'text', node, question: node.hint });
      }
      return;
    }

    if (node.type === 'bullets' || node.type === 'checklist') {
      const section = current ?? startSection();
      section.prompts.push({
        index,
        kind: node.type === 'bullets' ? 'list' : 'checklist',
        node,
        question: node.type === 'bullets' ? 'List the changes you made.' : 'Confirm each item.',
      });
    }
  });

  // Special case worth calling out: a section that has BOTH a free-text hint
  // and empty bullets (`## Changes` + `<!-- What changes ... -->` + `- - -`)
  // is asking for one thing, expressed twice. Asking twice is annoying, so the
  // hint becomes the question for the bullet list and the text prompt is
  // dropped. A hint followed by *checkboxes* is not merged: there the prose
  // ("How to test it?") is real content next to the checklist.
  for (const section of sections) {
    const textPrompt = section.prompts.find((p) => p.kind === 'text');
    const listPrompts = section.prompts.filter((p) => p.kind === 'list');
    if (textPrompt && listPrompts.length === 1) {
      listPrompts[0].question = textPrompt.question;
      section.prompts = section.prompts.filter((p) => p !== textPrompt);
    }
  }

  return sections.filter((section) => section.prompts.length > 0);
}

/**
 * Render the finished pull request body.
 *
 * Nodes with no answer in `answers` simply produce nothing beyond their own
 * structure, so the output always keeps the template's section order and
 * headings — that is what makes the result look "conventional" no matter what
 * the user typed.
 *
 * @param {Array<object>} nodes
 * @param {Record<number, string|string[]|boolean[]>} answers keyed by node index
 * @param {{keepComments?: boolean}} [options]
 * @returns {string}
 */
export function render(nodes, answers = {}, options = {}) {
  const { keepComments = false } = options;
  const blocks = []; // each block is a chunk of markdown, joined by a blank line

  nodes.forEach((node, index) => {
    switch (node.type) {
      case 'heading': {
        blocks.push(`${'#'.repeat(node.level)} ${node.title}`);
        const answer = answers[index];
        if (answer) blocks.push(String(answer).trim());
        if (keepComments && node.hint) blocks.push(`<!-- ${node.hint} -->`);
        break;
      }
      case 'comment':
        if (keepComments) blocks.push(`<!-- ${node.text} -->`);
        break;
      case 'text':
        blocks.push(node.lines.join('\n'));
        break;
      case 'bullets': {
        const items = (answers[index] ?? []).map((item) => String(item).trim()).filter(Boolean);
        if (items.length) blocks.push(items.map((item) => `- ${item}`).join('\n'));
        break;
      }
      case 'checklist': {
        const given = answers[index] ?? [];
        const lines = node.items.map((item, i) => {
          const checked = given[i] ?? item.checked;
          return `- [${checked ? 'x' : ' '}] ${item.text}`;
        });
        blocks.push(lines.join('\n'));
        break;
      }
      default:
        break;
    }
  });

  return `${blocks.filter((block) => block.trim() !== '').join('\n\n')}\n`;
}
