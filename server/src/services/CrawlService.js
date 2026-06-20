const path = require('path');
const fs = require('fs');
const nlpProcessor = require('../utils/nlpProcessor');
const addressParser = require('../utils/location/AddressParser');
const dataNormalizer = require('../utils/DataNormalizer');

const COOKIE_DIR = path.join(__dirname, '../../.crawl-cookies');

// CloakBrowser is ESM-only — load once and cache
let _launch = null;
async function getBrowserLaunch() {
  if (!_launch) {
    const mod = await import('cloakbrowser/puppeteer');
    _launch = mod.launch;
  }
  return _launch;
}

function cookiePath(url) {
  const host = new URL(url).hostname.replace(/\./g, '_');
  return path.join(COOKIE_DIR, `${host}.json`);
}

function loadCookies(url) {
  try {
    const p = cookiePath(url);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return [];
}

function saveCookies(url, cookies) {
  try {
    if (!fs.existsSync(COOKIE_DIR)) fs.mkdirSync(COOKIE_DIR, { recursive: true });
    fs.writeFileSync(cookiePath(url), JSON.stringify(cookies, null, 2));
  } catch {}
}

class CrawlService {
  /**
   * Test extract one page to preview results
   * @param {string} url - Target URL
   * @param {Object} selectors - Selectors from CrawlConfig model
   * @returns {Promise<Array>} - List of extracted items (limited for preview)
   */
  async testCrawl(url, selectors) {
    let browser;
    try {
      const launch = await getBrowserLaunch();
      browser = await launch({
        headless: true,
        humanize: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      console.log(`[testCrawl] Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.evaluate(async () => {
        await new Promise(resolve => {
          let total = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 100);
            total += 100;
            if (total >= Math.min(document.body.scrollHeight, 5000)) { clearInterval(timer); resolve(); }
          }, 100);
        });
      });
      await new Promise(r => setTimeout(r, 1000));
      // Preview: cap at 20 items
      return this._extractPage(page, selectors, 20);
    } catch (error) {
      console.error('[testCrawl] Error:', error.message);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Extract items from a single already-loaded page.
   * Reused by both testCrawl and fullCrawl.
   */
  async _extractPage(page, selectors, limit = 9999) {
    if (selectors.fields?.revealPhoneSelector) {
      try {
        await page.evaluate(() => {
          ['.re__contact-box-v2', '#divAdLeft', '#divAdRight', '.ad-banner', '.cookie-banner']
            .forEach(sel => { const el = document.querySelector(sel); if (el) el.remove(); });
        });
        const btns = await page.$$(selectors.fields.revealPhoneSelector);
        for (const btn of btns) {
          try {
            const rect = await btn.boundingBox();
            if (rect) await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2, { delay: 50 });
            else await btn.click({ delay: 50 }).catch(() => {});
            await new Promise(r => setTimeout(r, 300));
          } catch {}
        }
        await page.waitForFunction(
          (sel) => Array.from(document.querySelectorAll(sel)).every(b => !b.innerText.includes('***')),
          { timeout: 5000 }, selectors.fields.revealPhoneSelector
        ).catch(() => {});
      } catch {}
    }

    // Wait for any pending navigation (redirects) to settle before evaluating
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});

    let raw = [];
    try {
      raw = await page.evaluate((sel, lim) => {
      const container = sel.listContainer ? document.querySelector(sel.listContainer) : document.body;
      if (!container) return [];
      const nodes = Array.from(container.querySelectorAll(sel.itemSelector)).slice(0, lim);

      const extractText = (el, selector) => {
        if (!selector) return '';
        const target = el.querySelector(selector);
        if (!target) return '';
        const phoneAttrs = ['mobile', 'data-phone', 'data-mobile', 'at-phone'];
        const holder = target.closest('[mobile],[data-phone],[data-mobile]') || target;
        for (const a of phoneAttrs) {
          const v = holder.getAttribute(a);
          if (v && !v.includes('*') && /\d{9,11}/.test(v.replace(/\s/g, ''))) return v.trim();
        }
        const text = target.innerText?.trim() || '';
        if (text.includes('***')) {
          for (const a of phoneAttrs) { const v = target.getAttribute(a); if (v && !v.includes('*')) return v.trim(); }
        }
        if (text.length < 15 && /nay|qua|trước/.test(text)) {
          return target.getAttribute('aria-label') || target.getAttribute('title') || text;
        }
        return text;
      };
      const extractAttr = (el, selector, attr) => {
        if (!selector) return '';
        const t = el.querySelector(selector);
        return t ? (t.getAttribute(attr) || '') : '';
      };
      const extractImages = (el, selector) => {
        if (!selector) return [];
        return Array.from(el.querySelectorAll(selector))
          .map(img => img.src || img.getAttribute('data-src') || '')
          .filter(Boolean);
      };

      return nodes.map(el => {
        const f = sel.fields || {};
        const detailLink = (() => {
          const href = extractAttr(el, f.detailLink || 'a', 'href');
          if (href && href.startsWith('/')) return window.location.origin + href;
          return href;
        })();
        return {
          title: extractText(el, f.title),
          address: extractText(el, f.address),
          city: extractText(el, f.city),
          district: extractText(el, f.district),
          ward: extractText(el, f.ward),
          street: extractText(el, f.street),
          publishedDate: extractText(el, f.publishedDate),
          price: extractText(el, f.price),
          pricePerM2: extractText(el, f.pricePerM2),
          area: extractText(el, f.area),
          bedrooms: extractText(el, f.bedrooms),
          wc: extractText(el, f.wc),
          legal: extractText(el, f.legal),
          phone: extractText(el, f.phone),
          description: extractText(el, f.description),
          images: extractImages(el, f.images),
          detailLink,
        };
      });
    }, selectors, limit);
    } catch (evalErr) {
      console.error('[CrawlService] page.evaluate failed (context destroyed or timeout):', evalErr.message);
      return [];
    }

    return raw.map(item => {
      const nlpData = nlpProcessor.extractFromDescription(item.description);
      const textToSearch = `${item.address} ${item.city} ${item.district} ${item.title} ${item.description}`;
      const parsedLocation = addressParser.parse(textToSearch);
      return {
        ...item,
        ...nlpData,
        address: {
          city:        item.city        || parsedLocation.city        || '',
          district:    item.district    || parsedLocation.district    || '',
          ward:        item.ward        || parsedLocation.ward        || '',
          street:      item.street      || parsedLocation.street      || '',
          fullAddress: parsedLocation.fullAddress || item.address     || '',
        },
        phone: nlpProcessor.cleanPhone(item.phone),
        legal: item.legal || nlpData.legal || '',
        publishedDate: (() => {
          const d = nlpProcessor.parseRelativeDate(item.publishedDate);
          return d ? d.toISOString().split('T')[0] : item.publishedDate;
        })(),
        rawPrice:      dataNormalizer.parsePrice(item.price),
        rawArea:       dataNormalizer.parseArea(item.area || nlpData.area),
        rawPricePerM2: dataNormalizer.parsePricePerM2(item.pricePerM2) || null,
      };
    });
  }

  /**
   * Production crawl — respects pagination, uses cookie persistence.
   * Used by SchedulerService for auto and on-demand runs.
   */
  async fullCrawl(url, selectors, pagination = {}) {
    const maxPages = pagination?.maxPages || 5;
    const paramName = pagination?.paramName || 'page';
    const allItems = [];
    let browser;

    try {
      const launch = await getBrowserLaunch();
      browser = await launch({
        headless: true,
        humanize: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Load saved cookies to appear as a returning visitor
      const savedCookies = loadCookies(url);
      if (savedCookies.length) {
        await page.setCookie(...savedCookies);
        console.log(`[CrawlService] Loaded ${savedCookies.length} saved cookies for ${new URL(url).hostname}`);
      }

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const pageUrl = pageNum === 1
          ? url
          : `${url}${url.includes('?') ? '&' : '?'}${paramName}=${pageNum}`;

        console.log(`[CrawlService] Crawling page ${pageNum}/${maxPages}: ${pageUrl}`);

        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

          // Scroll to trigger lazy loads
          await page.evaluate(async () => {
            await new Promise(resolve => {
              let total = 0;
              const timer = setInterval(() => {
                window.scrollBy(0, 200);
                total += 200;
                if (total >= Math.min(document.body.scrollHeight, 5000)) { clearInterval(timer); resolve(); }
              }, 80);
            });
          });
          await new Promise(r => setTimeout(r, 800));

          const items = await this._extractPage(page, selectors);

          if (items.length === 0) {
            console.log(`[CrawlService] No items on page ${pageNum}, stopping pagination.`);
            break;
          }

          allItems.push(...items);
          console.log(`[CrawlService] Page ${pageNum}: ${items.length} items (total: ${allItems.length})`);

          // Random delay between pages (1–3s) to avoid rate limiting
          if (pageNum < maxPages) {
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
          }
        } catch (pageErr) {
          console.error(`[CrawlService] Page ${pageNum} failed: ${pageErr.message}`);
          break;
        }
      }

      // Save cookies after successful crawl
      const cookies = await page.cookies();
      if (cookies.length) saveCookies(url, cookies);

    } catch (error) {
      console.error('[CrawlService] fullCrawl error:', error.message);
      throw error;
    } finally {
      if (browser) await browser.close();
    }

    return allItems;
  }

  /**
   * Extract a simplified version of the DOM for AI analysis
   * @param {string} url - Target URL
   * @returns {Promise<string>} - Simplified HTML snippet
   */
  async getDOMSnippet(url) {
    let browser;
    try {
      const launch = await getBrowserLaunch();
      browser = await launch({
        headless: true,
        humanize: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1000 });

      console.log(`Getting DOM snippet from: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Scroll a bit to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(r => setTimeout(r, 1000));

      const simplifiedHTML = await page.evaluate(() => {
        // Clone the body to avoid modifying the actual page
        const bodyClone = document.body.cloneNode(true);
        
        // Remove non-essential elements for structural analysis
        const tagsToRemove = ['script', 'style', 'svg', 'iframe', 'canvas', 'noscript', 'header', 'footer', 'nav'];
        tagsToRemove.forEach(tag => {
          bodyClone.querySelectorAll(tag).forEach(el => el.remove());
        });

        // Optional: Remove comments
        const iterator = document.createNodeIterator(bodyClone, NodeFilter.SHOW_COMMENT);
        let currentNode;
        while (currentNode = iterator.nextNode()) {
          currentNode.parentNode.removeChild(currentNode);
        }

        // Return a portion of the body (first 20000 chars is usually enough for a few cards)
        const content = bodyClone.innerHTML;
        return content.substring(0, 20000); 
      });

      return simplifiedHTML;
    } catch (error) {
      console.error('getDOMSnippet error:', error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = new CrawlService();
