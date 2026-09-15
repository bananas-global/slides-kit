# Slides Kit

**One kit. Any brand.** An open-source HTML presentation toolkit by Bananas Global.

Write a deck as JSON, consume your Brand DNA stylesheet, and build a portable HTML presentation. Open it in Chrome, use the arrow keys to present, or print it as PDF.

## Quick start

Requires Node.js 22 or later.

```sh
git clone https://github.com/bananas-global/slides-kit.git
cd slides-kit
npm install
npm run example
```

Open `dist/example.html` in Chrome. The package is available from this repository; it has not been published to npm yet.

To use it inside another project:

```sh
npm install --save-dev /path/to/slides-kit
npx slides-kit build deck.json -o dist/deck.html
```

## A deck

```json
{
  "title": "A better way forward",
  "brand": {
    "name": "Your brand",
    "url": "https://example.com/brand-dna/"
  },
  "slides": [
    {
      "template": "cover",
      "surface": "s-signal",
      "slots": { "title": "A better way forward" }
    },
    {
      "template": "callout",
      "slots": { "statement": "One clear idea per slide." }
    }
  ]
}
```

## Brand DNA is the source of identity

`brand.url` points to a published Brand DNA **directory**. Slides Kit reads its generated `brand.css` on each build. Alternatively, `brand.css` accepts a local path or URL to that stylesheet. It uses the published `--brand-*` colors, fonts, weights, borders, radius and shadows.

The kit supplies composition and presentation mechanics. Read the brand's `design.md` and `brand-dna.json` when writing the story and choosing imagery: voice and creative direction are not automatically inferred by the renderer.

There is no brand registry, snapshot service, or release-tracking system. The HTML embeds the stylesheet and images needed for the deliverable. Rebuild to pick up brand changes.

Optional brand settings:

- `name`: text label when a surface has no supplied logo; omitted means no label.
- `logos`: `light`, `dark`, and `primary` image paths or URLs. Provide the actual artwork for each surface; the kit never recolors it.
- `fontStylesheet`: an HTTP(S) stylesheet URL for web fonts. Fonts are not bundled automatically; without installed fonts or a reachable font stylesheet, browser fallbacks apply.
- `layoutCss`: a local path or URL with presentation-specific composition overrides, loaded after the kit styles. Set `--slides-on-primary` if the brand needs a different foreground on its primary surface.

The inherited layout system uses presentation tints mixed from the canonical paper, ink and signal tokens. These are not a replacement for Brand DNA color scales. Override layout CSS for stricter brand-specific treatments.

The example uses explicitly authored demonstration tokens, not a copy of any client's Brand DNA.

## Layouts

| Template | Content slots |
| --- | --- |
| `cover` | `title` |
| `callout` | `eyebrow`, `statement` |
| `callout-quote` | `statement`, `name`, `role`, `initials` |
| `sequence` | `title`, `items` with `title`, `body`, optional `n` |
| `text-image` | `title`, `body`, `image`, `alt`, `caption` |
| `text-mock` | `title`, `body`, device content; see template |
| `list-image` | `title`, `items`, `image`; see template |
| `cards-icon` | `title`, `items`; see template |
| `cards-image` | `title`, `items`; see template |
| `marks-grid` | `title`, `items` with `mark`, `body` |
| `chart` | `title`, `spec` |
| `chart-split` | `title`, `spec`, supporting copy; see template |

See `assets/templates/` for exact slots. The first release includes the extracted layout library; the demo/browser suite exercises cover, callout, sequence and chart. Inspect additional layouts with your actual content before delivery.

Surfaces: `s-paper` (default), `s-ink`, `s-signal`. Use short copy, no more than two title lines, and split dense slides. Layouts are fixed at 16:9 with a 1920 × 1080 design stage.

Images are named in a top-level map:

```json
"images": { "hero": "./assets/hero.jpg" }
```

Then use `"image": "hero"` in a slide's slots. Paths are relative to the deck file. Images are embedded in the HTML. Missing referenced files stop the build with an error.

Optional slide properties include `label` and `notes`. Notes are available with `?notes` in the presentation URL. Plain strings are HTML-escaped. Prefix a slot with `<!--html-->` for intentional HTML; icon paths and custom CSS are also trusted author input. Do not build untrusted third-party manifests as a service without additional isolation.

## Charts

Supported types: `stat`, `bars`, `line`, `donut`, `timeline`. Supply `title`, `unit`, `period`, `source` and the type's data. See `examples/deck.json` for a bar chart. Every chart includes a caption and an accessible data table. Fictional demo numbers are labeled as such.

## PDF and current scope

Use the presentation's print button, select **Save as PDF**, enable background graphics, and disable browser headers/footers. The print stylesheet defines one 1920 × 1080 page per slide. Interactive behavior stays in HTML.

Native editable PowerPoint and an automated PDF CLI are not included in this release.

## Development

```sh
npm install
npx playwright install chromium
npm run check
```

Browser tests use installed Chrome on macOS when available, otherwise Playwright Chromium. Set `CHROME_PATH` to override. They exercise navigation, chart rendering, stage bounds and PDF generation. Test screenshots and PDF are written to ignored `dist/`.

Contributions are welcome. Keep brand identity out of the engine, use English for code and documentation, and include a rendering check for layout changes.

## License

MIT. Logos, photographs, fonts and other brand assets supplied by consumers remain subject to their respective licenses.

## Structured diagrams and tables (0.2)

`diagram` accepts `slots.diagramSpec` with `label`, an optional `height` (default 600), `nodes` and `edges`. The coordinate space is 1800 wide. A node has a unique `id`, `x`, `y`, `w`, `h`, `title` (string or lines), optional `body` (lines), and `tone` (`default`, `signal`, `accent`, `outline`). Edges contain a `points` array of `[x,y]` coordinates and an optional label with `labelX`/`labelY`. Geometry is explicit so an author can preserve relationships without relying on automatic graph layout. Labels are escaped; diagrams remain vector graphics in PDF.

`table` accepts `slots.tableSpec` with `headers` and `rows` of equal-length arrays. Both layouts support `title`, `eyebrow`, `lede`, and `note`. A slide's optional `source` is now printed above the footer. Covers also accept `subtitle`.
