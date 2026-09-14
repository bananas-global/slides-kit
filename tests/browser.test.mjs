import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from '../lib/build.mjs';

test('renders, navigates, and prints the demo', async () => {
  const result = await build('examples/deck.json','dist/test.html');
  const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(localChrome) ? localChrome : undefined) });
  try {
    const page=await browser.newPage({viewport:{width:1920,height:1080}, reducedMotion:"reduce"});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(result.path).href);
    assert.equal(await page.locator('.page').count(),5);
    for (let i=0;i<5;i++) {
      const active=page.locator('.page[data-active="true"]');
      assert.equal(await active.getAttribute('id'),`s${i+1}`);
      const bad = await active.evaluate(el => [...el.querySelectorAll('h2,.cover-statement,.callout-statement,.step,.chart')].filter(node => {
        const b=node.getBoundingClientRect(), stage=el.querySelector('.slide').getBoundingClientRect();
        return b.left < stage.left-1 || b.right > stage.right+1 || b.bottom > stage.bottom+1;
      }).map(node=>node.className));
      assert.deepEqual(bad,[]);
      await page.screenshot({path:resolve(`dist/slide-${i+1}.png`)});
      if(i<4) await page.keyboard.press('ArrowRight');
    }
    assert.equal(await page.locator('.chart svg').count(),1);
    assert.deepEqual(errors,[]);
    await page.pdf({path:'dist/example.pdf',preferCSSPageSize:true,printBackground:true});
  } finally {await browser.close();}
});
