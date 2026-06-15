const path = require('path');
const fs   = require('fs');

const SESSION_PATH = path.join(__dirname, '../../.fb-session.json');

// Reuse the same ESM-cached launch helper pattern
let _launch = null;
async function getBrowserLaunch() {
  if (!_launch) {
    const mod = await import('cloakbrowser/puppeteer');
    _launch = mod.launch;
  }
  return _launch;
}

class FBCrawlService {
  // ─── Session helpers ────────────────────────────────────────────────────────

  async _loadSession(page) {
    if (!fs.existsSync(SESSION_PATH)) return false;
    try {
      const cookies = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
      await page.setCookie(...cookies);
      return true;
    } catch { return false; }
  }

  async _saveSession(page) {
    const cookies = await page.cookies();
    fs.writeFileSync(SESSION_PATH, JSON.stringify(cookies, null, 2));
  }

  async _isLoggedIn(page) {
    try {
      const url = page.url();
      if (url.includes('/login') || url.includes('checkpoint')) return false;
      return await page.evaluate(() => {
        // Logged in = no login form present + has some user-specific element
        const hasLoginForm = !!document.querySelector('#email[type="email"], #loginform, [data-testid="royal_login_form"]');
        const hasUserNav   = !!document.querySelector('[aria-label="Account"], [data-testid="blue_bar_profile_link"], [aria-label="Your profile"]');
        return !hasLoginForm || hasUserNav;
      });
    } catch { return false; }
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async _login(page) {
    console.log('[FB] Logging in...');
    await page.goto('https://www.facebook.com/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Dismiss cookie consent if present
    try {
      const cookieBtn = await page.$('[data-cookiebanner="accept_button"], [title="Allow all cookies"]');
      if (cookieBtn) await cookieBtn.click();
      await new Promise(r => setTimeout(r, 800));
    } catch {}

    await page.type('#email', process.env.FB_EMAIL, { delay: 80 });
    await page.type('#pass',  process.env.FB_PASSWORD, { delay: 80 });
    await page.click('[name="login"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    const url = page.url();
    if (url.includes('login') || url.includes('checkpoint')) {
      throw new Error(
        url.includes('checkpoint')
          ? 'FB yêu cầu xác minh bảo mật (checkpoint). Vui lòng đăng nhập thủ công 1 lần.'
          : 'Đăng nhập FB thất bại — kiểm tra lại email/password trong .env'
      );
    }

    await this._saveSession(page);
    console.log('[FB] Login successful, session saved.');
  }

  // ─── Popup dismissal ────────────────────────────────────────────────────────

  async _dismissPopups(page) {
    const dismissSelectors = [
      '[aria-label="Close"]',
      '[aria-label="Đóng"]',
      'div[role="dialog"] [role="button"]:last-child',
    ];
    for (const sel of dismissSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) { await btn.click(); await new Promise(r => setTimeout(r, 500)); }
      } catch {}
    }
  }

  // ─── Expand truncated posts ─────────────────────────────────────────────────

  async _expandPosts(page) {
    // Click all "Xem thêm" / "See more" buttons to expand truncated posts
    let clicked = 0;
    try {
      clicked = await page.evaluate(() => {
        let count = 0;
        document.querySelectorAll('[role="button"]').forEach(btn => {
          const text = btn.innerText?.trim().toLowerCase();
          if (text === 'xem thêm' || text === 'see more' || text === 'xem thêm...' || text === 'more') {
            btn.click();
            count++;
          }
        });
        return count;
      });
      if (clicked > 0) {
        await new Promise(r => setTimeout(r, 1200));
        console.log(`[FB] Expanded ${clicked} truncated posts.`);
      }
    } catch {}
    return clicked;
  }

  // ─── Post extraction ────────────────────────────────────────────────────────

  async _collectPosts(page, limit) {
    const seen  = new Set();
    const posts = [];
    let   scrollAttempts = 0;
    const MAX_SCROLL = 8;

    while (posts.length < limit && scrollAttempts < MAX_SCROLL) {
      // Expand truncated posts before each extraction pass
      await this._expandPosts(page);

      const batch = await page.evaluate(() => {
        const results = [];

        // FB renders posts as role="article" elements
        const articles = document.querySelectorAll('[role="article"]');

        articles.forEach(article => {
          // Skip ads
          if (article.querySelector('[data-testid="sponsored-post"]')) return;

          // Get post text — collect all dir="auto" text nodes
          const textNodes = article.querySelectorAll('div[dir="auto"], span[dir="auto"]');
          const textParts = [];
          textNodes.forEach(n => {
            const t = n.innerText?.trim();
            if (t && t.length > 5 && !textParts.includes(t)) textParts.push(t);
          });
          const text = textParts.join('\n');

          if (text.length < 30) return;

          // Post permalink
          let postUrl = '';
          const timeLink = article.querySelector('a[href*="/posts/"], a[href*="story_fbid"], a[href*="permalink"]');
          if (timeLink) postUrl = timeLink.href;

          // Images from FB CDN
          const imgEls = article.querySelectorAll('img[src*="fbcdn"]');
          const images = Array.from(imgEls)
            .map(img => img.src)
            .filter(src => src && !src.includes('emoji') && !src.includes('static'))
            .slice(0, 5);

          results.push({ text, postUrl, images });
        });

        return results;
      });

      for (const p of batch) {
        const key = p.text.substring(0, 80);
        if (!seen.has(key)) {
          seen.add(key);
          posts.push(p);
          if (posts.length >= limit) break;
        }
      }

      if (posts.length < limit) {
        await page.evaluate(() => window.scrollBy(0, 1800));
        await new Promise(r => setTimeout(r, 2500));
        scrollAttempts++;
      }
    }

    return posts.slice(0, limit);
  }

  // ─── Main entry point ───────────────────────────────────────────────────────

  /**
   * Crawl a public FB group and return raw post data.
   * @param {string} groupUrl
   * @param {number} limit
   */
  async crawlGroup(groupUrl, limit = 10) {
    const launch = await getBrowserLaunch();

    // Show browser on first run so user can handle FB security challenges
    const headless = fs.existsSync(SESSION_PATH);
    console.log(`[FB] Starting browser (headless: ${headless})...`);

    const browser = await launch({
      headless,
      humanize: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      // Auth
      await this._loadSession(page);
      await page.goto('https://www.facebook.com', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      const loggedIn = await this._isLoggedIn(page);
      if (!loggedIn) await this._login(page);

      // Navigate to group
      console.log(`[FB] Navigating to group: ${groupUrl}`);
      await page.goto(groupUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      await this._dismissPopups(page);

      const posts = await this._collectPosts(page, limit);
      console.log(`[FB] Collected ${posts.length} posts.`);

      // Refresh saved session after successful crawl
      await this._saveSession(page);

      return posts;
    } finally {
      await browser.close();
    }
  }
}

module.exports = new FBCrawlService();
