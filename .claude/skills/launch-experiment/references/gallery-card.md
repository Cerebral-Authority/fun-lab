# Gallery card and icon links

## Card for `site/index.html`

Add inside `<ul class="grid">`. Replace `<name>` (folder name), `<Name>` (display name), `<Category>`, the description, and the video label. The styles (`.card-link`, `.preview`, `.source-links`, `.source-link`) already exist in `site/index.html`, as does the script that pauses previews for reduced motion visitors.

```html
<li class="item">
  <a class="card-link" href="/<name>/">
    <span class="tag"><Category></span>
    <h2><Name></h2>
    <video class="preview" src="/<name>/preview.mp4" poster="/<name>/preview.jpg"
      width="600" height="900" autoplay muted loop playsinline preload="metadata"
      aria-label="<Name> on a phone: <one sentence describing what the clip shows>"></video>
    <p><One or two sentence description.></p>
  </a>
  <div class="source-links">
    <a class="source-link" href="https://www.npmjs.com/package/@cerebralauthority/<name>"
      aria-label="<Name> on npm" title="npm package">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg>
    </a>
    <a class="source-link" href="https://github.com/Cerebral-Authority/fun-lab/tree/main/packages/<name>"
      aria-label="<Name> source on GitHub" title="Source on GitHub">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.37A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>
    </a>
  </div>
</li>
```

The GitHub and npm links live in `.source-links`, a sibling of `.card-link`, because a link cannot contain another link.

## Icon links on the demo page

In the demo's links row, each link carries its icon (styles: `.icon-link` in `packages/scroll-catapult/demo/index.html`):

```html
<a class="icon-link" href="https://github.com/Cerebral-Authority/fun-lab/tree/main/packages/<name>"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.37A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>Docs and source on GitHub</a>
<a class="icon-link" href="https://www.npmjs.com/package/@cerebralauthority/<name>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg>npm package</a>
```

Copy icon paths from here or from an existing page, never retype them: a single mistyped number breaks the shape.

## README section

```markdown
### [<Name>](packages/<name>)

<a href="https://fun-lab.cerebralauthority.com/<name>/"><img src="packages/<name>/demo/preview.gif" width="280" alt="<Name> on a phone: <what the clip shows>"></a>

<One line description.>
[Try it](https://fun-lab.cerebralauthority.com/<name>/) · [Docs](packages/<name>) · `npm i @cerebralauthority/<name>`
```
