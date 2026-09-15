import { icons } from "lucide";
import { renderDiagram, renderTable } from "./structured.mjs";
import { loadBrand } from "./brand.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const TPL = join(KIT, "templates");

/* template name -> the class(es) that go on .slide */
const CLASSES = {
  diagram: "tpl-diagram",
  table: "tpl-table",
  cover: "tpl-cover",
  callout: "tpl-callout",
  "callout-quote": "tpl-callout tpl-callout--quote",
  sequence: "tpl-sequence",
  "text-image": "tpl-text-image",
  "text-mock": "tpl-text-mock",
  "list-image": "tpl-list-image",
  "cards-icon": "tpl-cards-icon",
  "cards-image": "tpl-cards-image",
  "marks-grid": "tpl-marks-grid",
  chart: "tpl-chart",
  "chart-split": "tpl-chart tpl-chart--split",
};

const VARIANTS = {"s-paper": "light", "s-ink": "dark", "s-signal": "primary"};
function die(message) { throw new Error(message); }
export const escape = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
function slotHtml(value) { const text = String(value); return text.startsWith("<!--html-->") ? text.slice(11) : escape(text); }
function asset(index, ref, kind, surface, className) {
  const value = index.images[ref];
  if (!value) die(`Unknown asset "${ref}". Add it to deck.images.`);
  return kind === "mark" ? `<img class="${className || 'mark-art'}" src="${escape(value)}" alt="${escape(ref)}">` : escape(value);
}

/* Repeat the block between <!-- item:start --> and <!-- item:end --> once
   per item, filling {{item.*}} from that item's fields. */
function expandItems(template, items, index, surface) {
  const open = "<!-- item:start -->\n";
  const close = "<!-- item:end -->\n";
  const from = template.indexOf(open);
  if (from < 0) return template;
  const to = template.indexOf(close, from);
  const block = template.slice(from + open.length, to);
  if (!Array.isArray(items) || !items.length) die("this template needs a non-empty items[]");
  const body = items
    .map((item, position) =>
      block.replace(/\{\{item\.([\w.]+)\}\}/g, (_, key) => {
        if (key === "stepMarker" && item.iconName) {
          const node = icons[item.iconName];
          if (!node) throw new Error(`Unknown Lucide icon: ${item.iconName}`);
          const paths = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([name, value]) => `${name}="${escape(value)}"`).join(" ")}/>`).join("");
          return `<svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
        }
        if (key === "stepMarker") return `<span class="step-n">${escape(item.n ?? String(position + 1).padStart(2, "0"))}</span>`;
        let value = item[key];
        if (value === undefined && key === "n") value = String(position + 1).padStart(2, "0");
        if (value === undefined) return "";
        if (key === "image") return asset(index, value);
        if (key === "mark") return asset(index, value, "mark", surface, "mark-art");
        if (key === "icon") return String(value); /* raw Lucide paths */
        return slotHtml(value);
      }),
    )
    .join("");
  return template.slice(0, from) + body + template.slice(to + close.length);
}

/* Fill {{slot}}s. A slot with no value takes its whole line out of the
   markup, which is how optional slots (caption, lede, notes)
   disappear cleanly instead of leaving an empty element behind. */
function fillSlots(template, values) {
  return template
    .split("\n")
    .map((line) => {
      const names = [...line.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]);
      if (names.some((name) => values[name] === undefined || values[name] === "")) return null;
      return line.replace(/\{\{([\w.]+)\}\}/g, (_, name) => values[name]);
    })
    .filter((line) => line !== null)
    .join("\n");
}

export async function build(manifestPath, output) {
  const root = dirname(resolve(manifestPath));
  const near = p => isAbsolute(p) ? p : join(root, p);
  const deck = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!deck.title || !Array.isArray(deck.slides) || !deck.slides.length) die("A deck needs a title and at least one slide.");
  const outPath = output ? resolve(output) : near(deck.out || "deck.html");
  const { css, logos, images, fontLink, layoutCss } = await loadBrand(deck, root);
  const index = { images };
  let base = await readFile(join(KIT, "deck-base.html"), "utf8");
  const wrapper = await readFile(join(TPL, "_slide-wrapper.html"), "utf8");
  const header = await readFile(join(TPL, "_head.html"), "utf8");

  base = base.replace("{{BRAND_CSS}}", () => css).replaceAll("{{LAYOUT_CSS}}", () => layoutCss).replace("</head>", () => `${fontLink}</head>`);
  base = base.replaceAll("{{LAYOUT_CSS}}", () => layoutCss);
  const structuredCss = await readFile(join(KIT, "structured.css"), "utf8");
  base = base.replace("</head>", () => `<style>${structuredCss}\n${layoutCss}</style></head>`);
  const total = deck.slides.length;
  const sections = [];

  for (const [position, slide] of deck.slides.entries()) {
    const n = position + 1;
    const name = slide.template;
    if (!(name in CLASSES)) die(`slide ${n}: unknown template "${name}"`);
    const surface = slide.surface || "s-paper";
    if (!(surface in VARIANTS)) die(`slide ${n}: unknown surface "${surface}"`);

    let content = await readFile(join(TPL, `${name}.html`), "utf8");
    content = content.replace(/^<!--[\s\S]*?-->\n/, "");            /* drop the spec comment */
    if (content.includes("{{head}}")) content = content.replace("{{head}}", header.replace(/^<!--[\s\S]*?-->\n/, "").trimEnd());

    const slots = { ...slide.slots };
    if (slots.items) content = expandItems(content, slots.items, index, surface);
    if (slots.image) slots.image = asset(index, slots.image);
    slots.count = Array.isArray(slots.items) ? String(slots.items.length) : slots.count;

    const variant = VARIANTS[surface];
    const logo = logos[variant];
    const lockup = slide.lockup ? asset(index, slide.lockup, "mark", surface, "lockup")
      : logo ? `<img class="lockup" src="${escape(logo)}" alt="${escape(deck.brand.name || '')}">`
      : `<span class="lockup brand-name">${escape(deck.brand.name || '')}</span>`;
    const values = {};
    for (const [key, value] of Object.entries(slots)) {
      if (value === undefined || Array.isArray(value)) continue;
      values[key] = key === "spec" ? JSON.stringify(value === Object(value) ? value : JSON.parse(value)).replace(/</g, "\\u003c") : key === "image" ? value : slotHtml(value);
    }
    if (name === "diagram") values.diagram = renderDiagram(slots.diagramSpec, `s${n}`);
    if (name === "table") values.table = renderTable(slots.tableSpec);
    values.lockup = lockup;
    values.n = String(n);

    sections.push(
      fillSlots(wrapper.replace(/^<!--[\s\S]*?-->\n/, ""), {
        n: String(n),
        nn: String(n).padStart(2, "0"),
        total: String(total),
        tt: String(total).padStart(2, "0"),
        label: escape(slide.label || name),
        surface,
        template: CLASSES[name],
        source: deck.showSources === false ? "" : escape(slide.source || ""),
        notes: slide.notes ? slotHtml(slide.notes) : undefined,
        content: fillSlots(content, values).trimEnd(),
        DECK_TITLE: escape(deck.title),
        DECK_DATE: escape(deck.date),
      }),
    );
  }

  /* Only the first slide is active before the engine runs, so a no-JS or
     print view still shows a deck rather than a stack. */
  sections[0] = sections[0].replace('<section class="page"', '<section class="page" data-active="true"');

  const html = base
    .replace(/\{\{LANG\}\}/g, escape(deck.lang || "en"))
    .replace(/\{\{DECK_TITLE\}\}/g, escape(deck.title))
    .replace(/\{\{DECK_DATE\}\}/g, escape(deck.date))
    /* Anchored to its own line: {{SLIDES}} is also named in the head comment.
       A function replacement keeps `$` inside data URIs literal. */
    .replace(/^\{\{SLIDES\}\}$/m, () => sections.join("\n"));

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html);
  return { path: outPath, slides: total };
}
