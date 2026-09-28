// Runs an experiment's browser behavior tests in headless Chrome.
//
//   npm test -- <name>
//
// Loads packages/<name>/test/behavior.html, which writes PASS or FAIL lines
// into <pre id="out"> between RESULTS and DONE. Needs Google Chrome; set
// CHROME to override its path.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const name = process.argv[2];
if (!name) {
  console.error('usage: npm test -- <package-name>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = join(root, 'packages', name, 'test', 'behavior.html');
if (!existsSync(page)) {
  console.error('missing ' + page);
  process.exit(1);
}

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--window-size=400,800', '--virtual-time-budget=20000', '--dump-dom',
  pathToFileURL(page).href
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });

const out = (dom.match(/<pre id="out">([\s\S]*?)<\/pre>/) || [])[1] || '';
if (!out.includes('DONE')) {
  console.log(out || 'no results: the test page did not finish');
  process.exit(1);
}
const lines = out.split('\n').filter(l => /^(PASS|FAIL) /.test(l));
lines.forEach(l => console.log(l));
const failed = lines.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (lines.length - failed) + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
