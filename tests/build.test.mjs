import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from '../lib/build.mjs';

test('builds without optional date/source and escapes content', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'slides-kit-'));
  try {
    const deck = { title: 'A & B', brand: { css: resolve('examples/brand.css') }, slides: [{ template:'cover', slots:{ title:'<hello> $&' } }] };
    await writeFile(join(dir,'deck.json'), JSON.stringify(deck));
    await build(join(dir,'deck.json'),join(dir,'deck.html'));
    const html = await readFile(join(dir,'deck.html'),'utf8');
    assert.match(html, /<section class="page" data-active="true" id="s1"/);
    assert.match(html, /&lt;hello&gt; \$&amp;/);
    assert.doesNotMatch(html, /\{\{[\w.]+\}\}/);
    deck.slides[0].template = 'missing';
    await writeFile(join(dir,'deck.json'), JSON.stringify(deck));
    await assert.rejects(build(join(dir,'deck.json')), /unknown template/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
