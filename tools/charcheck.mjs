/* Find characters that look like a space (or a hyphen, or a quote) but are not.
 *
 * This exists because equal-looking strings that compare unequal have cost this
 * codebase multiple debugging rounds: `toLocaleString('en-ZA')` separates
 * thousands with U+00A0, a test compared it against a plain space, and the
 * failure message printed two identical-looking strings.
 *
 * The rule is NOT "ban these characters" — some are correct in prose (a real
 * non-breaking space between a number and its unit is good typography). The
 * rule is "make them visible", so a human can decide. In HTML prefer the named
 * entity; in JS build them from char codes.
 *
 * Usage:  node tools/charcheck.mjs                 # scan the whole repo
 *         node tools/charcheck.mjs catalogue.js    # scan named files
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SUSPECT = new Map([
  [0x00a0, 'NO-BREAK SPACE'],
  [0x202f, 'NARROW NO-BREAK SPACE'],
  [0x2009, 'THIN SPACE'],
  [0x2007, 'FIGURE SPACE'],
  [0x2060, 'WORD JOINER'],
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200e, 'LEFT-TO-RIGHT MARK'],
  [0xfeff, 'BYTE ORDER MARK'],
]);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'tools']);
const EXT = /\.(html|css|js|mjs|json|md|txt)$/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(entry)) out.push(full);
  }
  return out;
}

const targets = process.argv.length > 2
  ? process.argv.slice(2).map((f) => join(ROOT, f))
  : walk(ROOT);

let hits = 0;
for (const file of targets) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    [...line].forEach((ch, col) => {
      const code = ch.codePointAt(0);
      if (!SUSPECT.has(code)) return;
      hits++;
      /* Show the character as an escape so the report itself cannot be
         copy-pasted into a new instance of the same bug. */
      const shown = line.replace(
        new RegExp(String.fromCodePoint(code), 'g'),
        `\\u${code.toString(16).padStart(4, '0')}`,
      );
      console.log(
        `${relative(ROOT, file)}:${i + 1}:${col + 1}  U+${code.toString(16).toUpperCase().padStart(4, '0')} ${SUSPECT.get(code)}`,
      );
      console.log(`    ${shown.trim().slice(0, 150)}`);
    });
  });
}

console.log(hits ? `\n${hits} suspect character(s).` : '\nClean — no look-alike whitespace.');
process.exit(hits ? 1 : 0);
