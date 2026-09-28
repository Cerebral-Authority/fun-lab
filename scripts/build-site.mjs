// Assembles the static site in _site/:
//   site/                     -> _site/            (the lab home page)
//   packages/<name>/demo/     -> _site/<name>/     (each experiment's demo)
//   packages/<name>/<files>   -> _site/<name>/     (the library the demo loads)
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');

rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'site'), out, { recursive: true });

for (const name of readdirSync(join(root, 'packages'))) {
  const dir = join(root, 'packages', name);
  const demo = join(dir, 'demo');
  if (!existsSync(demo)) continue;

  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const dest = join(out, name);
  cpSync(demo, dest, { recursive: true });
  for (const file of pkg.files || []) cpSync(join(dir, file), join(dest, file));
  console.log('built /' + name + '/');
}

console.log('site ready in _site/');
