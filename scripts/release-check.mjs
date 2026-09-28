// Verifies a published release and prints its pinned install snippet.
//
//   npm run release-check -- <name>
//
// Downloads <package>@<version> from npm, confirms its library file matches
// this repo byte for byte, computes the sha384 integrity hash from the
// published file, and checks that the package README and demo page carry
// the matching snippet.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const name = process.argv[2];
if (!name) {
  console.error('usage: npm run release-check -- <package-name>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'packages', name);
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const spec = pkg.name + '@' + pkg.version;
const tmp = mkdtempSync(join(tmpdir(), 'fun-lab-release-'));
let failed = false;
const fail = msg => { console.log('FAIL  ' + msg); failed = true; };
const pass = msg => console.log('ok    ' + msg);

try {
  let tarball;
  try {
    tarball = execFileSync('npm', ['pack', spec, '--pack-destination', tmp, '--silent'], { encoding: 'utf8' }).trim().split('\n').pop();
  } catch (e) {
    console.log('FAIL  ' + spec + ' is not on npm yet (publish it first, or wait a minute and retry)');
    process.exit(1);
  }
  pass(spec + ' is published');
  execFileSync('tar', ['-xzf', join(tmp, tarball), '-C', tmp]);

  const published = readFileSync(join(tmp, 'package', pkg.main));
  const local = readFileSync(join(pkgDir, pkg.main));
  published.equals(local)
    ? pass(pkg.main + ' on npm matches this repo byte for byte')
    : fail(pkg.main + ' on npm differs from this repo (unreleased changes? bump the version and publish)');

  const integrity = 'sha384-' + createHash('sha384').update(published).digest('base64');
  const url = 'https://cdn.jsdelivr.net/npm/' + spec + '/' + pkg.main;

  for (const file of ['README.md', 'demo/index.html']) {
    let text = '';
    try { text = readFileSync(join(pkgDir, file), 'utf8'); } catch (e) { continue; }
    text.includes(integrity) && text.includes(spec + '/' + pkg.main)
      ? pass(file + ' has the snippet for ' + pkg.version)
      : fail(file + ' does not have the snippet for ' + pkg.version + ' (paste the one below)');
  }

  console.log('\nInstall snippet for ' + spec + ':\n');
  console.log('<script src="' + url + '"\n  integrity="' + integrity + '"\n  crossorigin="anonymous"></script>');
  console.log('\nCDN link to open in a browser: ' + url);
  console.log('Tag the release: git tag -a ' + name + '@' + pkg.version + ' -m "' + spec + '" && git push origin ' + name + '@' + pkg.version);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
