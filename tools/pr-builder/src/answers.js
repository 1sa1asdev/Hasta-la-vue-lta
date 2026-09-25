/**
 * answers.js — map a hand-written JSON answer file onto the parsed template.
 *
 * This exists for two reasons:
 *  1. Non-interactive runs (CI, scripts, demos) without re-implementing the
 *     whole flow.
 *  2. Testability: the mapping is pure, so it can be unit tested.
 *
 * Format (keys are section titles, exactly as they appear in the template):
 *
 *   {
 *     "title": "feat: add guide search",
 *     "sections": {
 *       "Description": "Adds a search field to the guides page.",
 *       "Motivation": { "text": "Guides were hard to find at scale." },
 *       "Changes": { "list": ["Add search input", "Filter guides by title"] },
 *       "Testing": { "checks": { "Tests pass locally": true } },
 *       "Checklist": { "checks": { "Documentation updated if necessary": false } }
 *     }
 *   }
 *
 * Shorthands: a string means `{ text }`, an array means `{ list }`.
 * Checklist items you do not mention keep whatever the template says, so you
 * only have to list the ones you want to change.
 */

const EMPTY = {};

/**
 * @param {Array<{heading: object|null, prompts: Array<object>}>} plan from planPrompts()
 * @param {object} data parsed JSON answer file
 * @returns {{answers: Record<number, string|string[]|boolean[]>, missing: string[]}}
 */
export function answersFromFile(plan, data = EMPTY) {
  const sections = data.sections ?? {};
  const answers = {};
  const missing = [];

  for (const section of plan) {
    const title = section.heading?.title;
    const given = title == null ? undefined : findKey(sections, title);
    if (given === undefined) {
      if (title) missing.push(title);
      continue;
    }

    const normalised = normalise(given);
    for (const prompt of section.prompts) {
      if (prompt.kind === 'text' && normalised.text !== undefined) {
        answers[prompt.index] = String(normalised.text);
      }
      if (prompt.kind === 'list' && normalised.list !== undefined) {
        answers[prompt.index] = normalised.list.map(String);
      }
      if (prompt.kind === 'checklist' && normalised.checks !== undefined) {
        answers[prompt.index] = prompt.node.items.map((item) => {
          const value = findKey(normalised.checks, item.text, true);
          return value === undefined ? item.checked : Boolean(value);
        });
      }
    }
  }

  return { answers, missing };
}

function normalise(given) {
  if (typeof given === 'string') return { text: given };
  if (Array.isArray(given)) return { list: given };
  if (given && typeof given === 'object') return given;
  return {};
}

/** Case-insensitive lookup so "changes" matches "Changes". */
function findKey(object, key, exactFirst = false) {
  if (key in object) return object[key];
  const wanted = String(key).toLowerCase();
  const found = Object.keys(object).find((candidate) => candidate.toLowerCase() === wanted);
  if (found !== undefined) return object[found];
  return exactFirst ? undefined : undefined;
}
