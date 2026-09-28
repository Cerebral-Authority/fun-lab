# Fun Lab

Free, open source UX and UI experiments by [Cerebral Authority](https://cerebralauthority.com). Try each one live at **[fun-lab.cerebralauthority.com](https://fun-lab.cerebralauthority.com)**, then add it to your own site with one line.

## Experiments

### [Scroll Catapult](packages/scroll-catapult)

<a href="https://fun-lab.cerebralauthority.com/scroll-catapult/"><img src="packages/scroll-catapult/demo/preview.gif" width="280" alt="Scroll Catapult on a phone: the scrollbar charges under a pulled finger, the page launches to the bottom and detonates"></a>

Hold, aim, and launch the page on mobile. A full charge slams the end of the page and detonates.
[Try it](https://fun-lab.cerebralauthority.com/scroll-catapult/) · [Docs](packages/scroll-catapult) · `npm i @cerebralauthority/scroll-catapult`

Each experiment is its own npm package, so you only download the ones you use. Setup instructions and options are in each package's README.

## License

MIT. Use them in personal and commercial projects; keep the copyright notice.

---

## Maintainer guide

### How the repo is organized

```
fun-lab/
├── packages/                     one folder per experiment
│   └── scroll-catapult/
│       ├── scroll-catapult.js    the library itself (what people install)
│       ├── scroll-catapult.d.ts  TypeScript types
│       ├── package.json          its npm name, version, and which files npm ships
│       ├── README.md             its docs, shown on GitHub and npm
│       ├── LICENSE
│       └── demo/                 its live demo page (website only, never on npm)
│           ├── index.html
│           ├── preview.mp4       looping clip for the lab home card
│           ├── preview.jpg       still frame for reduced motion visitors
│           └── preview.gif       the same clip for READMEs
├── site/
│   └── index.html                the lab home page (the gallery of cards)
├── scripts/
│   └── build-site.mjs            assembles the website from the folders above
└── .github/workflows/pages.yml   deploys the website on every push to main
```

### Where each file ends up

The same folders feed two destinations.

| Destination | What goes there | How |
| --- | --- | --- |
| **The website** (fun-lab.cerebralauthority.com) | `site/index.html` becomes `/`. Each `packages/<name>/demo/` becomes `/<name>/`, with the library file copied next to it. | Automatic on every push to `main` |
| **npm** (what developers install) | Only the files listed under `"files"` in that package's `package.json`, plus its README and LICENSE. The `demo/` folder is never shipped. | Manual: `npm publish` from the package folder |

So a new folder at `packages/buzzer/` with a `demo/` inside automatically becomes `fun-lab.cerebralauthority.com/buzzer/`. The build script finds every package folder that has a `demo/`; nothing needs registering.

### Add a new experiment

1. **Copy the folder.** Duplicate `packages/scroll-catapult` as `packages/<new-name>`. Use lowercase with hyphens; the folder name becomes the URL path.
2. **Replace the library.** Rename and rewrite `<new-name>.js` and `<new-name>.d.ts`.
3. **Update `package.json`.** Change `name`, `description`, `version` (start at `0.1.0`), `homepage`, `repository.directory`, the file names under `files`, `main`, `types`, `unpkg`, and `jsdelivr`.
4. **Rewrite its `README.md`** with the new install lines and options.
5. **Build the demo** in `demo/index.html`. It loads the library as `./<new-name>.js`.
6. **Add a preview clip** to `demo/` (`preview.mp4`, `preview.jpg`, `preview.gif`) and a card to `site/index.html`, then a section to this README.
7. **Preview locally** with `npm run preview` and open http://localhost:8080/<new-name>/.
8. **Push to `main`.** The site updates in about a minute.
9. **Publish to npm** when it is ready for other people (see below).

### Change an existing experiment

- **Demo page, preview, or home card only:** edit and push. The website updates; npm is unaffected.
- **The library itself:** edit, push, then publish a new version to npm. Sites pinned to the old version keep it until they choose to upgrade.

### Release a version to npm

```bash
cd packages/<name>
# 1. bump "version" in package.json:
#    0.1.0 -> 0.1.1  bug fix
#    0.1.0 -> 0.2.0  new option or behavior (while below 1.0, treat this as possibly breaking)
#    1.0.0 -> 2.0.0  after 1.0, any breaking change
npm publish
```

jsDelivr serves new npm versions automatically, usually within minutes.

### Preview locally

```bash
npm run preview
```

Open http://localhost:8080. To test on a phone on the same Wi-Fi, open `http://<this computer's IP>:8080`.

### Hosting

The site deploys to GitHub Pages from `.github/workflows/pages.yml` on every push to `main`. The custom domain `fun-lab.cerebralauthority.com` is set in the repo's Settings, Pages, with a GoDaddy DNS record `CNAME fun-lab -> cerebral-authority.github.io`. The domain is verified on the Cerebral-Authority account, so no other GitHub account can serve Pages on it.
