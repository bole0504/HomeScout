const nlpProcessor = require('../utils/nlpProcessor');
const addressParser = require('../utils/location/AddressParser');
const dataNormalizer = require('../utils/DataNormalizer');

// CloakBrowser is ESM-only — load once and cache
let _launch = null;
async function getBrowserLaunch() {
  if (!_launch) {
    const mod = await import('cloakbrowser/puppeteer');
    _launch = mod.launch;
  }
  return _launch;
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

      console.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // 1. Smart Scroll Phase: Scroll and wait for lazy loads
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          let distance = 100;
          let timer = setInterval(() => {
            let scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight || totalHeight > 5000) { 
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      await new Promise(r => setTimeout(r, 1000));

      // NEW: Robust Handle reveal phone click
      if (selectors.fields?.revealPhoneSelector) {
        console.log(`[RevealPhone] Using selector: ${selectors.fields.revealPhoneSelector}`);
        try {
          // Remove potential overlays like cookie banners or popups that might block clicks
          await page.evaluate(() => {
            const overlays = [
              '.re__contact-box-v2', // some floating boxes
              '#divAdLeft', '#divAdRight', // side ads
              '.ad-banner', '.cookie-banner'
            ];
            overlays.forEach(sel => {
              const el = document.querySelector(sel);
              if (el) el.remove();
            });
          });

          const revealButtons = await page.$$(selectors.fields.revealPhoneSelector);
          console.log(`[RevealPhone] Found ${revealButtons.length} buttons.`);

          for (let i = 0; i < revealButtons.length; i++) {
            try {
              const rect = await revealButtons[i].boundingBox();
              if (rect) {
                await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2, { delay: 50 });
              } else {
                await revealButtons[i].click({ delay: 50 }).catch(() => {});
              }
              // Wait between clicks to avoid rate limiting
              await new Promise(r => setTimeout(r, 300));
            } catch (clickErr) {
              console.warn(`[RevealPhone] Click error at item ${i + 1}`);
            }
          }

          // Wait for DOM to update: poll until no *** remain, max 5s
          try {
            await page.waitForFunction(
              (sel) => {
                const btns = document.querySelectorAll(sel);
                return Array.from(btns).every(btn => !btn.innerText.includes('***'));
              },
              { timeout: 5000 },
              selectors.fields.revealPhoneSelector
            );
            console.log('[RevealPhone] All phones revealed.');
          } catch {
            console.warn('[RevealPhone] Timeout waiting for reveal — some phones may still be masked.');
          }
        } catch (e) {
          console.log('[RevealPhone] Critical error:', e.message);
        }
      }

      const results = await page.evaluate((sel) => {
        const items = [];
        const container = sel.listContainer ? document.querySelector(sel.listContainer) : document.body;
        
        if (!container) return [];

        const elementNodes = container.querySelectorAll(sel.itemSelector);
        
        // Take top 20 for preview
        const limit = Math.min(elementNodes.length, 20);
        
        for (let i = 0; i < limit; i++) {
          const el = elementNodes[i];
          const item = {};
          
          // Helper to extract text from a selector relative to the item
          const extractText = (selector) => {
            if (!selector) return '';
            const target = el.querySelector(selector);
            if (!target) return '';
            
            let text = target.innerText.trim();

            // Phone attribute check: look on target AND its closest parent
            // batdongsan sets mobile="..." on outer span, not the inner span
            const phoneAttrs = ['mobile', 'data-phone', 'data-mobile', 'at-phone', 'data-at-phone'];
            const attrHolder = target.closest('[mobile],[data-phone],[data-mobile]') || target;
            for (const attr of phoneAttrs) {
              const val = attrHolder.getAttribute(attr);
              if (val && !val.includes('*') && /\d{9,11}/.test(val.replace(/\s/g, ''))) return val.trim();
            }

            // Fallback: still masked, check target's own attrs
            if (text.includes('***')) {
              for (const attr of phoneAttrs) {
                const val = target.getAttribute(attr);
                if (val && !val.includes('*')) return val.trim();
              }
            }

            // 2. If text is a relative date (e.g. "Hôm nay", "3 ngày trước"), 
            // try to get precise date from aria-label or title
            if (text.length < 15 && (text.includes('nay') || text.includes('qua') || text.includes('trước'))) {
                const preciseDate = target.getAttribute('aria-label') || 
                                    target.getAttribute('title') || 
                                    target.getAttribute('data-microtip-label');
                if (preciseDate) return preciseDate;
            }
            
            return text;
          };

          // Helper to extract attribute (like href)
          const extractAttr = (selector, attr) => {
            if (!selector) return '';
            const target = el.querySelector(selector);
            return target ? target.getAttribute(attr) : '';
          };

          // Helper to extract multiple images
          const extractImages = (selector) => {
            if (!selector) return [];
            const imgNodes = el.querySelectorAll(selector);
            return Array.from(imgNodes).map(img => img.src || img.getAttribute('data-src') || img.getAttribute('src')).filter(src => !!src);
          };

          const fieldSelectors = sel.fields || {};
          item.title = extractText(fieldSelectors.title);
          item.address = extractText(fieldSelectors.address);
          item.publishedDate = extractText(fieldSelectors.publishedDate);
          
          item.price = extractText(fieldSelectors.price);
          item.pricePerM2 = extractText(fieldSelectors.pricePerM2);
          item.area = extractText(fieldSelectors.area);
          item.bedrooms = extractText(fieldSelectors.bedrooms);
          item.wc = extractText(fieldSelectors.wc);
          item.legal = extractText(fieldSelectors.legal);
          
          item.phone = extractText(fieldSelectors.phone);
          item.description = extractText(fieldSelectors.description);
          item.images = extractImages(fieldSelectors.images);
          item.detailLink = extractAttr(fieldSelectors.detailLink || 'a', 'href');
          
          // Handle relative links
          if (item.detailLink && item.detailLink.startsWith('/')) {
            const baseUrl = window.location.origin;
            item.detailLink = baseUrl + item.detailLink;
          }

          items.push(item);
        }
        
        return items;
      }, selectors);

      // Enrich data with NLP (outside of page.evaluate to keep it clean)
      const enrichedResults = results.map(item => {
        // 1. NLP from description
        const nlpData = nlpProcessor.extractFromDescription(item.description);
        
        // 2. Hierarchical Address Analysis (New & Robust)
        // Try parsing from multiple sources in order of reliability
        const textToSearch = `${item.address} ${item.title} ${item.description}`;
        const parsedLocation = addressParser.parse(textToSearch);

        const finalAddress = {
          city: item.city || parsedLocation.city || '',
          district: item.district || parsedLocation.district || '',
          ward: item.ward || parsedLocation.ward || '',
          street: item.street || parsedLocation.street || '',
          fullAddress: parsedLocation.fullAddress || item.address || item.title
        };

        const cleanPhone = nlpProcessor.cleanPhone(item.phone);
        const parsedDate = nlpProcessor.parseRelativeDate(item.publishedDate);
        const formattedDate = parsedDate ? parsedDate.toISOString().split('T')[0] : item.publishedDate;

        // Normalize numeric values (Price, Area)
        const rawPrice = dataNormalizer.parsePrice(item.price);
        const rawArea = dataNormalizer.parseArea(item.area || nlpData.area);
        const rawPricePerM2 = dataNormalizer.parsePricePerM2(item.pricePerM2) || 
                              (rawPrice && rawArea ? Math.round(rawPrice / rawArea) : null);

        return { 
          ...item, 
          ...nlpData, 
          address: finalAddress,
          phone: cleanPhone,
          legal: item.legal || nlpData.legal || '',
          publishedDate: formattedDate,
          rawPrice,
          rawArea,
          rawPricePerM2
        };
      });

      return enrichedResults;
    } catch (error) {
      console.error('Crawl Error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
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
