import { chromium } from 'playwright';

const base = 'http://localhost:5173/nihongo-benkyou-program/';
const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme: 'light' });

await page.goto(base);
await page.evaluate(() => localStorage.setItem('kanjiApp.theme', 'light'));
await page.reload();
await page.waitForTimeout(400);

async function findWhiteText(label, shot) {
  const results = await page.evaluate(() => {
    function isWhiteish(c) {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      return r > 235 && g > 235 && b > 235;
    }
    const out = [];
    document.querySelectorAll('body *').forEach((el) => {
      const hasOwnText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!hasOwnText) return;
      const style = getComputedStyle(el);
      const color = style.color;
      if (isWhiteish(color)) {
        let bgEl = el;
        let bg = getComputedStyle(bgEl).backgroundColor;
        while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && bgEl.parentElement) {
          bgEl = bgEl.parentElement;
          bg = getComputedStyle(bgEl).backgroundColor;
        }
        out.push({ tag: el.tagName, cls: el.className, text: el.textContent.trim().slice(0, 40), color, bg });
      }
    });
    return out;
  });
  console.log(`--- ${label}: ${results.length} white-text elements ---`);
  if (results.length) console.log(JSON.stringify(results, null, 2));
  if (shot) await page.screenshot({ path: shot, fullPage: true });
}

const dir = '/private/tmp/claude-501/-Users-choechanhyeog-Documents-JapaneseLangBenkyo-nihongo-benkyou-program/02fda0c4-fe65-4877-b2c2-caed7fec4280/scratchpad';

// go to kanji nav item precisely (sidebar nav list item with exact text)
await page.click('nav >> text="한자"', { timeout: 5000 }).catch(async () => {
  await page.click('.sidebar >> text=한자');
});
await page.waitForTimeout(300);
await findWhiteText('Kanji page landing', `${dir}/k1.png`);

// click 학습 sub-tab if present, then start a batch
const studyTab = await page.$('text=학습');
if (studyTab) { await studyTab.click(); await page.waitForTimeout(300); }
await findWhiteText('Kanji study tab', `${dir}/k2.png`);

const startBtn = await page.$('.study-start-button');
if (startBtn) {
  await startBtn.click();
  await page.waitForTimeout(400);
  await findWhiteText('Kanji study card', `${dir}/k3.png`);
}

await browser.close();
