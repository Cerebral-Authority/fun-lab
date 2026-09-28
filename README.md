# Fun Lab

Free, open source UX and UI experiments by [Cerebral Authority](https://cerebralauthority.com). Try each one live at **[fun-lab.cerebralauthority.com](https://fun-lab.cerebralauthority.com)**, then add it to your own site with one line.

## Experiments

| Name | What it does | Demo | Install |
| --- | --- | --- | --- |
| [Scroll Catapult](packages/scroll-catapult) | Hold, aim, and launch the page on mobile | [Try it](https://fun-lab.cerebralauthority.com/scroll-catapult/) | `npm i @cerebralauthority/scroll-catapult` |

Each experiment is its own npm package, so you only download the ones you use. Setup instructions and options are in each package's README.

## License

MIT. Use them in personal and commercial projects; keep the copyright notice.

---

## Maintainer notes

### Layout

```
packages/<name>/          one folder per experiment, published to npm on its own
  <name>.js               the library (no build step, no dependencies)
  <name>.d.ts             TypeScript types
  package.json            name, version, and the files npm ships
  README.md               install and options, shown on npm and GitHub
  demo/index.html         the live demo, served at /<name>/
site/index.html           the lab home page, served at /
scripts/build-site.mjs    assembles _site/ for GitHub Pages
```

### Preview locally

```bash
npm run preview
```

Then open http://localhost:8080. To test on a phone on the same Wi-Fi, open `http://<this computer's IP>:8080`.

### Add a new experiment

1. Copy `packages/scroll-catapult` to `packages/<new-name>` and replace the library, types, README and demo.
2. Update the name, version, description and homepage in its `package.json`.
3. Add a card to `site/index.html` and a row to the table above.
4. Push to `main`. The site deploys automatically.

### Release a package to npm

```bash
cd packages/<name>
# bump "version" in package.json first
npm publish
```

jsDelivr picks up new npm versions automatically, usually within minutes.

### Hosting

The site deploys to GitHub Pages from `.github/workflows/pages.yml` on every push to `main`. The custom domain `fun-lab.cerebralauthority.com` is set in the repo's Settings, Pages, with a DNS record `CNAME fun-lab -> cerebral-authority.github.io`.
