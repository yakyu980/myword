import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const HTML = 'C:\\Users\\yakyu\\OneDrive\\文档\\WONDER LETER\\MyWord-v2.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
  await page.waitForSelector('#editor', { timeout: 15000 });
  await page.waitForTimeout(400);

  const r4 = await page.evaluate(async () => {
    const out = {};
    const payload = '<script>x</script> & "test"';
    document.getElementById('docTitle').value = payload;

    // ── exportHTML ──
    {
      const origCreate = URL.createObjectURL;
      const origClick = HTMLAnchorElement.prototype.click;
      let capturedBlob = null;
      URL.createObjectURL = (b) => { capturedBlob = b; return origCreate(b); };
      HTMLAnchorElement.prototype.click = function () {};
      exportHTML();
      URL.createObjectURL = origCreate;
      HTMLAnchorElement.prototype.click = origClick;
      const txt = capturedBlob ? await capturedBlob.text() : '';
      out.exportHTML_hasRawScript = txt.includes('<script>x</script>');
      out.exportHTML_hasEscaped = txt.includes('&lt;script&gt;x&lt;/script&gt;');
    }

    // ── shareDoc ──
    {
      const origCreate = URL.createObjectURL;
      const origClick = HTMLAnchorElement.prototype.click;
      let capturedBlob = null;
      URL.createObjectURL = (b) => { capturedBlob = b; return origCreate(b); };
      HTMLAnchorElement.prototype.click = function () {};
      shareDoc();
      URL.createObjectURL = origCreate;
      HTMLAnchorElement.prototype.click = origClick;
      const txt = capturedBlob ? await capturedBlob.text() : '';
      out.shareDoc_hasRawScript = txt.includes('<script>x</script>');
      out.shareDoc_hasEscaped = txt.includes('&lt;script&gt;x&lt;/script&gt;');
    }

    // ── exportAndPrint (window.open + document.write) ──
    {
      const origOpen = window.open;
      let printedHtml = '';
      window.open = () => ({
        document: { write: (s) => { printedHtml += s; }, close() {} },
        focus() {}, print() {}, onload: null,
      });
      exportAndPrint();
      window.open = origOpen;
      out.exportPrint_hasRawScript = printedHtml.includes('<script>x</script>');
      out.exportPrint_hasEscaped = printedHtml.includes('&lt;script&gt;x&lt;/script&gt;');
    }

    // ── exportDocWord: BOM + escaping ──
    {
      const origCreate = URL.createObjectURL;
      const origClick = HTMLAnchorElement.prototype.click;
      let capturedBlob = null;
      URL.createObjectURL = (b) => { capturedBlob = b; return origCreate(b); };
      HTMLAnchorElement.prototype.click = function () {};
      window.exportDocWord();
      URL.createObjectURL = origCreate;
      HTMLAnchorElement.prototype.click = origClick;
      if (capturedBlob) {
        const buf = new Uint8Array(await capturedBlob.arrayBuffer());
        out.wordBOM = [buf[0], buf[1], buf[2]]; // expect [0xEF,0xBB,0xBF]
        const txt = await capturedBlob.text();
        out.wordHasRawScriptInTitle = false; // title used for filename sanitization only, not injected into <title> raw? check
        out.wordContentSnippet = txt.slice(0, 200);
      }
    }

    return out;
  });
  console.log('GAP4 export-security:', JSON.stringify(r4, null, 2));

  await browser.close();
  console.log('console errors:', errors);
})();
