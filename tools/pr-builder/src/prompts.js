/**
 * prompts.js — the interactive question layer.
 *
 * Built on Node's built-in `readline`, so the tool needs zero dependencies.
 * Everything is promise-based so the CLI can `await` questions in a loop.
 *
 * Two details that matter in practice:
 *  - Multiline answers end with a line containing only `.` (same muscle memory
 *    as `git commit -m`). Blank lines inside the answer are fine.
 *  - Lines are read into a queue instead of using `rl.question()` per prompt.
 *    That is what makes `printf '...' | npm run pr` work: with `rl.question`,
 *    readline emits every buffered line as soon as it can, and any line that
 *    arrives while no question is pending is silently thrown away.
 *    Queueing means no input is ever lost, and it behaves identically for a
 *    human at a keyboard and for a piped script.
 *
 * When the input ends (Ctrl-D, or the end of a pipe) every remaining question
 * resolves to `null` — "no input left" — and the helpers fall back to their
 * defaults instead of hanging or crashing.
 */

import readline from 'node:readline';

export function createPrompter({ input = process.stdin, output = process.stdout } = {}) {
  const interactive = Boolean(input.isTTY);
  const rl = readline.createInterface({
    input,
    output,
    // `terminal: true` enables line editing/echo. That is only correct when a
    // human is typing, i.e. when stdin is a TTY.
    terminal: interactive,
  });

  /** Lines read from stdin that no question has claimed yet. */
  const queue = [];
  let closed = false;
  let pending = null;

  rl.on('line', (line) => {
    queue.push(line);
    deliver();
  });

  rl.on('close', () => {
    closed = true;
    deliver();
  });

  /** Hand the next queued line to whoever is waiting for one. */
  function deliver() {
    if (!pending) return;
    const resolve = pending;
    if (queue.length > 0) {
      pending = null;
      const line = queue.shift();
      // A human already sees what they typed; a pipe does not, so echo the
      // answer to keep transcripts and logs readable.
      if (!interactive) output.write(`${line}\n`);
      resolve(line);
    } else if (closed) {
      pending = null;
      resolve(null); // input is exhausted
    }
  }

  /**
   * Writes the prompt, then resolves with the next line of input.
   * Resolves to `null` once stdin is exhausted.
   */
  function question(query) {
    output.write(query);

    if (queue.length > 0) {
      const line = queue.shift();
      if (!interactive) output.write(`${line}\n`);
      return Promise.resolve(line);
    }
    if (closed) return Promise.resolve(null);

    return new Promise((resolve) => {
      pending = resolve;
      deliver();
    });
  }

  /** Free text on one line, with an optional default shown in parentheses. */
  async function ask(query, { defaultValue } = {}) {
    const shown = defaultValue ? ` (${defaultValue})` : '';
    const answer = await question(`${query}${shown} › `);
    if (answer === null) return defaultValue ?? '';
    return answer.trim() || defaultValue || '';
  }

  /**
   * Free text over several lines, terminated by a line containing only `.`.
   * Used for prose sections like Description and Motivation.
   */
  async function multiline(query, { hint } = {}) {
    output.write(`\n${query}\n`);
    if (hint) output.write(`  ${hint}\n`);
    const lines = [];
    for (;;) {
      const line = await question('  › ');
      if (line === null) break;
      if (line.trim() === '.') break;
      lines.push(line);
    }
    while (lines.length > 0 && lines.at(-1).trim() === '') lines.pop();
    return lines.join('\n').trim();
  }

  /**
   * A bullet list: one item per line. Leading `- ` is stripped so users can
   * paste a list they already wrote somewhere else.
   */
  async function list(query, { suggestions = [] } = {}) {
    let items = suggestions.slice();
    if (items.length > 0) {
      output.write(`\nDetected from git:\n${items.map((item) => `  • ${item}`).join('\n')}\n`);
      const useThem = await confirm('Use these as the list?', { defaultValue: true });
      if (!useThem) items = [];
    }

    if (items.length === 0) {
      const text = await multiline(query, {
        hint: 'One item per line. Finish with a line containing only "." — leave it empty to skip.',
      });
      items = text
        .split('\n')
        .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
        .filter(Boolean);
    }
    return items;
  }

  /** Yes/no question. Empty input (just Enter) takes the default. */
  async function confirm(query, { defaultValue = true } = {}) {
    const suffix = defaultValue ? '[Y/n]' : '[y/N]';
    for (;;) {
      const line = await question(`${query} ${suffix} `);
      if (line === null) return defaultValue;
      const answer = line.trim().toLowerCase();
      if (answer === '') return defaultValue;
      if (['y', 'yes'].includes(answer)) return true;
      if (['n', 'no'].includes(answer)) return false;
      output.write('  Please answer "y" or "n".\n');
    }
  }

  return {
    ask,
    multiline,
    list,
    confirm,
    say: (text = '') => output.write(`${text}\n`),
    close: () => rl.close(),
    /** True when stdin ended and there is no queued line left to answer with. */
    get exhausted() {
      return closed && queue.length === 0;
    },
  };
}
