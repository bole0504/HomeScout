# CapNhatGia — Tech Stack Spec

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Client (React + Vite + Ant Design)         │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │ Property │  │ Good     │  │ Bookmarks        │   │    │
│  │  │ List     │  │ Price    │  │ (Per User)       │   │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │ Admin: Crawl Config | Config List | Users    │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (HTTPS)
┌──────────────────────────▼──────────────────────────────────┐
│                      RENDER.COM                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Server (Node.js + Express)                 │    │
│  │                                                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │    │
│  │  │ REST API   │  │ Crawl      │  │ Scheduler    │   │    │
│  │  │ Routes     │  │ Engine     │  │ (node-cron)  │   │    │
│  │  └────────────┘  └────────────┘  └──────────────┘   │    │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │    │
│  │  │ DOM        │  │ Data       │  │ Price        │   │    │
│  │  │ Learner    │  │ Validator  │  │ Analyzer     │   │    │
│  │  └────────────┘  └────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Mongoose Driver
┌──────────────────────────▼──────────────────────────────────┐
│                    MONGODB ATLAS                             │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ ┌───────────┐   │
│  │ Properties │ │ CrawlConf  │ │ Users   │ │ Bookmarks │   │
│  └────────────┘ └────────────┘ └─────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend

| Category | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **Framework** | React | 18.x | Ecosystem mạnh, phù hợp với Ant Design |
| **Build Tool** | Vite | 5.x | Nhanh, HMR tốt, cấu hình đơn giản |
| **UI Library** | Ant Design | 5.x | Component library hoàn chỉnh cho enterprise app (Table, Form, Card, Tabs, Pagination, Cascader...) |
| **Routing** | React Router | 6.x | Standard React routing |
| **HTTP Client** | Axios | 1.x | Interceptors cho auth token |
| **State** | React Context + useState | Built-in | Đủ cho app scale này, không cần Redux |
| **Icons** | @ant-design/icons | 5.x | Tích hợp tốt với Ant Design |
| **Deploy** | Vercel | — | Free tier, CI/CD tự động từ Git |

### Frontend Project Init
```bash
npx -y create-vite@latest ./ --template react
npm install antd @ant-design/icons axios react-router-dom dayjs
```

---

## Backend

| Category | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **Runtime** | Node.js | 20.x LTS | Stable, long-term support |
| **Framework** | Express.js | 4.x | Lightweight, flexible |
| **Database ODM** | Mongoose | 8.x | Schema validation, middleware hooks |
| **Auth** | jsonwebtoken + bcryptjs | — | JWT stateless auth |
| **Crawl Engine** | Puppeteer | 22.x | Headless browser cho JS-rendered pages |
| **Stealth** | puppeteer-extra + stealth plugin | — | Bypass anti-bot detection |
| **HTML Parser** | Cheerio | 1.x | Fast DOM parsing sau khi Puppeteer render |
| **Scheduler** | node-cron | 3.x | Cron syntax cho scheduled crawl |
| **Validation** | Joi | 17.x | Request validation |
| **CORS** | cors | 2.x | Cross-origin cho frontend |
| **Env** | dotenv | 16.x | Environment variables |
| **Deploy** | Render.com | — | Free tier, auto-deploy từ Git |

### Backend Project Init
```bash
npm init -y
npm install express mongoose dotenv cors jsonwebtoken bcryptjs
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth cheerio
npm install node-cron joi morgan helmet
npm install -D nodemon
```

> [!WARNING]
> **Puppeteer trên Render.com**: Render free tier có giới hạn RAM (512MB). Puppeteer cần ~200-300MB/instance. Cần cấu hình:
> - `--no-sandbox` flag
> - Giới hạn concurrent browser instances = 1
> - Đóng browser sau mỗi crawl session
> - Có thể cần nâng lên paid plan nếu crawl nhiều URL

---

## Database — MongoDB Atlas

### Connection
```
mongodb+srv://<user>:<pass>@cluster.xxxxx.mongodb.net/capnhatgia
```

### Collections & Indexes

| Collection | Key Indexes | Rationale |
|------------|------------|-----------|
| `properties` | `{ contentHash: 1 }` unique | Deduplication |
| `properties` | `{ "address.province": 1, "address.district": 1, "address.ward": 1 }` | Filter theo khu vực |
| `properties` | `{ goodPrice: 1, createdAt: -1 }` | Tab giá hời |
| `properties` | `{ pricePerM2: 1 }` | Sort theo giá |
| `properties` | `{ status: 1 }` | Filter active/archived |
| `crawlconfigs` | `{ isActive: 1 }` | Scheduler query |
| `bookmarks` | `{ userId: 1, propertyId: 1 }` unique compound | Per-user bookmark |
| `users` | `{ email: 1 }` unique | Login lookup |

### Atlas Free Tier Limits
- Storage: 512MB
- Connections: 500
- Đủ cho giai đoạn đầu (~50K properties)

---

## Project Structure

```
CapNhatGia/
├── specs/                           # ← BẠN ĐANG Ở ĐÂY
│   ├── mission.md
│   ├── tech-stack.md
│   ├── roadmap.md
│   ├── property-valuation-data.md   # Data fields cho định giá BĐS
│   └── ui-specs.md
│
├── server/                          # Backend (deploy → Render)
│   ├── package.json
│   ├── .env                         # Local env (gitignored)
│   ├── .env.example                 # Template
│   ├── src/
│   │   ├── index.js                 # Express entry point
│   │   ├── config/
│   │   │   ├── database.js          # Mongoose connection
│   │   │   └── constants.js         # App constants
│   │   ├── models/
│   │   │   ├── Property.js
│   │   │   ├── CrawlConfig.js
│   │   │   ├── User.js
│   │   │   └── Bookmark.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── properties.js
│   │   │   ├── crawl.js
│   │   │   ├── bookmarks.js
│   │   │   └── users.js
│   │   ├── services/
│   │   │   ├── crawlEngine.js       # Puppeteer + Cheerio
│   │   │   ├── domLearner.js        # DOM analysis
│   │   │   ├── dataValidator.js     # Validate + normalize
│   │   │   ├── deduplicator.js      # Hash-based dedup
│   │   │   ├── priceAnalyzer.js     # Good price calc
│   │   │   └── scheduler.js         # node-cron
│   │   └── middleware/
│   │       ├── auth.js              # JWT verify
│   │       ├── admin.js             # Admin role check
│   │       └── errorHandler.js
│   └── render.yaml                  # Render deploy config
│
├── client/                          # Frontend (deploy → Vercel)
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json                  # Vercel config (SPA rewrite)
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                  # Router
│       ├── api/
│       │   └── index.js             # Axios instance
│       ├── contexts/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   └── useBookmark.js
│       ├── layouts/
│       │   ├── MainLayout.jsx
│       │   └── AdminLayout.jsx
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── PropertyListPage.jsx
│       │   └── admin/
│       │       ├── CrawlConfigPage.jsx
│       │       ├── ConfigListPage.jsx
│       │       └── UserManagementPage.jsx
│       ├── components/
│       │   ├── PropertyCard.jsx
│       │   ├── PropertyFilters.jsx
│       │   ├── DomLearnerPanel.jsx
│       │   └── BookmarkButton.jsx
│       └── styles/
│           └── index.css
│
├── .gitignore
└── README.md
```

---

## Environment Variables

### Server (.env)
```bash
# Database
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Crawl
CRAWL_INTERVAL_MINUTES=15
MAX_CONCURRENT_BROWSERS=1
GOOD_PRICE_RECALC_CRON=0 2 * * *    # 2AM daily

# App
PORT=5000
NODE_ENV=production
CLIENT_URL=https://capnhatgia.vercel.app
```

### Client (.env)
```bash
VITE_API_URL=https://capnhatgia-api.onrender.com/api
```

---

## Key Technical Decisions

### 1. Puppeteer vs Playwright
**Chọn Puppeteer** vì:
- Ecosystem lớn hơn cho stealth plugins
- `puppeteer-extra-plugin-stealth` đã proven cho anti-bot bypass
- Đủ cho use case chỉ crawl Chrome

### 2. Ant Design vs Custom UI
**Chọn Ant Design** vì:
- User yêu cầu
- Enterprise-ready components (Table, Form, Cascader)
- Tiết kiệm thời gian UI development

### 3. Context API vs Redux
**Chọn Context API** vì:
- App state không quá phức tạp 
- Chỉ cần auth state + vài shared states
- Giảm boilerplate

### 4. REST vs GraphQL
**Chọn REST** vì:
- Đơn giản, dễ implement
- Phù hợp với CRUD operations
- Dễ cache với CDN

### 5. Render.com Considerations
- Free tier spin down sau 15 phút inactive → cold start ~30s
- Cron scheduler sẽ giữ server alive vì chạy mỗi 15 phút
- Nếu cần: dùng UptimeRobot ping mỗi 14 phút
