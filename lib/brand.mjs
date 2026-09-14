import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

async function read(location, root) {
  if (/^https?:\/\//.test(location)) {
    const response = await fetch(location, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Could not load ${location}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(resolve(root, location));
}
async function image(location, root) {
  if (location.startsWith('data:image/')) return location;
  const bytes = await read(location, root);
  const extension = extname(location.split('?')[0]).toLowerCase();
  const mime = { '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif' }[extension];
  if (!mime) throw new Error(`Unsupported image extension: ${location}`);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}
export async function loadBrand(deck, root) {
  const brand = deck.brand;
  if (!brand || (!brand.css && !brand.url)) throw new Error('Set brand.url to a published Brand DNA directory, or brand.css to its generated stylesheet.');
  const location = brand.css || new URL('brand.css', brand.url.replace(/\/?$/, '/')).href;
  const stylesheet = (await read(location, root)).toString();
  if (!stylesheet.includes('--brand-paper:') || !stylesheet.includes('--brand-ink:')) throw new Error('The stylesheet must provide Brand DNA --brand-* tokens.');
  let fontLink = '';
  if (brand.fontStylesheet) {
    if (!/^https?:\/\//.test(brand.fontStylesheet)) throw new Error('fontStylesheet must be an HTTP(S) URL.');
    fontLink = `<link rel="stylesheet" href="${brand.fontStylesheet.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">`;
  }
  const logos = {}, images = {};
  for (const [key, value] of Object.entries(brand.logos || {})) logos[key] = await image(value, root);
  for (const [key, value] of Object.entries(deck.images || {})) images[key] = await image(value, root);
  const aliases = ['signal','accent','success','warning','error','paper','ink','border'].map(key => `--${key}:var(--brand-${key});`);
  // Presentation tints are layout mechanics; canonical brand tokens stay intact.
  for (let stop = 0; stop <= 1000; stop += 50) {
    const target = stop < 500 ? '--brand-paper' : '--brand-ink';
    const amount = Math.abs(stop - 500) / 5;
    aliases.push(`--signal-${stop}:color-mix(in srgb,var(--brand-signal),var(${target}) ${amount}%);`);
  }
  const css = `${stylesheet}\n:root {
${aliases.join('\n')}
--font-heading:var(--brand-font-heading); --font-body:var(--brand-font-body); --font-utility:var(--brand-font-utility);
--w-heading:var(--brand-heading-weight); --w-body:var(--brand-body-weight);
--white:var(--brand-paper); --text-body:color-mix(in srgb,var(--brand-ink) 75%,var(--brand-paper));
--text-body-on-dark:color-mix(in srgb,var(--brand-paper) 80%,var(--brand-ink));
--border-on-dark:color-mix(in srgb,var(--brand-paper) 30%,transparent);
--radius-card:var(--brand-radius); --radius-image:var(--brand-radius); --radius-frame:var(--brand-radius); --radius-pill:var(--brand-button-radius);
--shadow-base:var(--brand-shadow-md); --shadow-lg:var(--brand-shadow-lg); --accent-800:var(--brand-accent);
}
.brand-name { font: var(--w-heading) 2cqw var(--font-heading); height:auto; }
.s-paper.tpl-cover { color:var(--ink); background:var(--paper); }
.s-ink,.s-signal { --chart-ink:currentColor; --chart-muted:currentColor; }
`;
  return { css, logos, images, fontLink, layoutCss: brand.layoutCss ? (await read(brand.layoutCss, root)).toString() : "" };
}
