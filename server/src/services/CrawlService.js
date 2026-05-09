const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const nlpProcessor = require('../utils/nlpProcessor');

puppeteer.use(StealthPlugin());

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
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      // Set a realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      );

      console.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a bit for any lazy-loaded content
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

      // NEW: Handle reveal phone click if selector is provided
      if (selectors.fields?.revealPhoneSelector) {
        try {
          await page.evaluate((sel) => {
            const buttons = document.querySelectorAll(sel);
            buttons.forEach(btn => btn.click());
          }, selectors.fields.revealPhoneSelector);
          // Wait for any network/DOM changes after clicks
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        } catch (e) {
          console.log('Error clicking reveal phone buttons:', e.message);
        }
      }

      const results = await page.evaluate((sel) => {
        const items = [];
        const container = sel.listContainer ? document.querySelector(sel.listContainer) : document.body;
        
        if (!container) return [];

        const elementNodes = container.querySelectorAll(sel.itemSelector);
        
        // Take top 5 for preview
        const limit = Math.min(elementNodes.length, 5);
        
        for (let i = 0; i < limit; i++) {
          const el = elementNodes[i];
          const item = {};
          
          // Helper to extract text from a selector relative to the item
          const extractText = (selector) => {
            if (!selector) return '';
            const target = el.querySelector(selector);
            if (!target) return '';
            
            let text = target.innerText.trim();
            
            // If text contains asterisks (hidden phone), try to get from common attributes
            if (text.includes('***')) {
              const attrPhone = target.getAttribute('mobile') || 
                                target.getAttribute('data-phone') || 
                                target.getAttribute('data-mobile') || 
                                target.getAttribute('raw');
              if (attrPhone) return attrPhone;
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
          item.address = extractText(fieldSelectors.address);
          item.price = extractText(fieldSelectors.price);
          item.pricePerM2 = extractText(fieldSelectors.pricePerM2);
          item.area = extractText(fieldSelectors.area);
          item.bedrooms = extractText(fieldSelectors.bedrooms);
          item.wc = extractText(fieldSelectors.wc);
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
        const nlpData = nlpProcessor.extractFromDescription(item.description);
        const cleanPhone = nlpProcessor.cleanPhone(item.phone);
        return { ...item, ...nlpData, phone: cleanPhone };
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
}

module.exports = new CrawlService();
