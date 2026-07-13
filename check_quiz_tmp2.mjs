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
      if (isWhiteish(style.color)) {
        let bgEl = el, bg = getComputedStyle(bgEl).backgroundColor;
        while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && bgEl.parentElement) {
          bgEl = bgEl.parentElement; bg = getComputedStyle(bgEl).backgroundColor;
        }
        out.push({ tag: el.tagName, cls: el.className, text: el.textContent.trim().slice(0, 40), color: style.color, bg });
      }
    });
    return out;
  });
  console.log(`--- ${label}: ${results.length} white-text elements ---`);
  if (results.length) console.log(JSON.stringify(results, null, 2));
  if (shot) await page.screenshot({ path: shot, fullPage: true });
}

const dir = '/private/tmp/claude-501/-Users-choechanhyeog-Documents-JapaneseLangBenkyo-nihongo-benkyou-program/02fda0c4-fe65-4877-b2c2-caed7fec4280/scratchpad';

await page.click('nav >> text="한자"').catch(() => page.click('.sidebar >> text=한자'));
await page.waitForTimeout(300);
await page.click('text=퀴즈');
await page.waitForTimeout(400);
await findWhiteText('Kanji quiz setup', `${dir}/q1.png`);

const startBtn = await page.$('.start-button');
if (startBtn) {
  await startBtn.click();
  await page.waitForTimeout(400);
  await findWhiteText('Kanji quiz running', `${dir}/q2.png`);

  // pick the WRONG choice deliberately: try choice 2 first, check feedback
  const choices = await page.$$('.quiz-choice');
  if (choices.length) {
    await choices[choices.length - 1].click(); // likely wrong sometimes
    await page.waitForTimeout(300);
    await findWhiteText('Kanji quiz feedback (choice clicked)', `${dir}/q3.png`);
  }
  // if a "다음" button appeared (wrong answer), click it and inspect the very next frame
  const nextBtn = await page.$('.quiz-next-button');
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(50); // check IMMEDIATELY after click, before effects settle
    await findWhiteText('Kanji quiz right after Next click (transient?)', `${dir}/q4.png`);
    await page.waitForTimeout(400);
    await findWhiteText('Kanji quiz settled after Next', `${dir}/q5.png`);
  }
}

await browser.close();
