// Smoke test for Plan & Code. Optional — the tools themselves need no dependencies.
// Needs Playwright (npm i -D playwright && npx playwright install chromium) and Python 3.
//   node tests/smoke.cjs            # starts a static server on :8099, runs the checks
// Exits non-zero on the first failure.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8099, BASE = `http://localhost:${PORT}/`;
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) failed++; };

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    const watch = page => { const errs = []; page.on('pageerror', e => errs.push(e.message)); return errs; };

    console.log('index.html');
    { const p = await browser.newPage(); const errs = watch(p);
      await p.goto(BASE + 'index.html');
      ok(await p.locator('a[href="blueprint.html"]').count() > 0, 'links to the blueprint tool');
      const broken = await p.$$eval('img', imgs => imgs.filter(i => i.loading !== 'lazy' && !i.naturalWidth).length);
      ok(broken === 0, 'eager images load');
      ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
      await p.close(); }

    console.log('blueprint.html');
    { const p = await browser.newPage({ viewport: { width: 1400, height: 850 } }); const errs = watch(p);
      await p.goto(BASE + 'blueprint.html'); await p.waitForTimeout(1600);
      ok(await p.locator('#elList .chip').count() === 4, 'demo seeds 4 tracked elements');
      // select hero, nudge with keyboard, check planned rect moved
      await p.locator('#elList .chip', { hasText: 'hero' }).first().click();
      await p.keyboard.press('2');
      const y0 = +(await p.inputValue('#py'));
      await p.keyboard.press('Shift+ArrowDown');
      const y1 = +(await p.inputValue('#py'));
      ok(Math.abs(y1 - y0 - 5) < 0.01, `shift+↓ nudges plan 5% (${y0} → ${y1})`);
      // label with markup must render as text
      await p.fill('#labTxt', '<b>x</b>');
      ok((await p.locator('#elList .chip b').count()) === 0, 'labels are escaped in the list');
      await p.click('#exportAI');
      const spec = await p.inputValue('#out');
      ok(spec.startsWith('# SITE BLUEPRINT — AI HANDOFF (v2)') && spec.includes('PLANNED:'), 'AI handoff export has planned geometry');
      const raw = JSON.parse(spec.slice(spec.indexOf('## RAW JSON (authoritative)') + 28));
      ok(raw.version === 2 && raw.elements['#hero'].plan, 'raw JSON is parseable');
      // import round-trip
      const file = path.join(os.tmpdir(), 'pac-import.json');
      fs.writeFileSync(file, JSON.stringify({ version: 2, site: './demo/index.html', elements: { '#cta': { label: 'buy', plan: { x: 1, y: 2, w: 3, h: 4 }, notes: ['n'], anims: [] } }, drawings: {} }));
      await p.setInputFiles('#importFile', file);
      await p.waitForTimeout(300);
      ok(await p.locator('#elList .chip').count() === 1, 'import replaces the blueprint');
      ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
      await p.close(); }

    console.log('blueprint.html?page=./demo/shelf.html');
    { const p = await browser.newPage({ viewport: { width: 1400, height: 850 } }); const errs = watch(p);
      await p.goto(BASE + 'blueprint.html?page=' + encodeURIComponent('./demo/shelf.html')); await p.waitForTimeout(1600);
      ok(await p.locator('#elList .chip').count() === 3, 'shelf demo seeds 3 tracked elements');
      const v = await p.frameLocator('#site').locator('body').getAttribute('data-view');
      ok(v === 'shelf', 'shelf demo starts in the shelf view');
      ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
      await p.close(); }

    console.log('plan.html');
    { const p = await browser.newPage({ viewport: { width: 1400, height: 850 } }); const errs = watch(p);
      await p.goto(BASE + 'plan.html'); await p.waitForTimeout(500);
      const code = await p.inputValue('#out');
      ok(/export const ROOM = \{/.test(code) && /export const ITEMS = \[/.test(code), 'layout code exports ROOM and ITEMS');
      // the generated module must be importable and round-trip
      const mod = await p.evaluate(async c => { const m = await import('data:text/javascript,' + encodeURIComponent(c)); return { room: m.ROOM, n: m.ITEMS.length }; }, code);
      ok(mod.n === 9 && mod.room.minX === -820, 'generated layout.js is a valid module');
      await p.locator('[data-id="globe"]').click();
      await p.keyboard.press('r');
      ok(await p.inputValue('#crot') === '15', 'R rotates the selected item 15°');
      ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
      await p.close(); }
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
