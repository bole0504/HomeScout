# CapNhatGia - Hệ Thống Cập Nhật Giá Bất Động Sản

Hệ thống tự động crawl, theo dõi và phân tích giá bất động sản Việt Nam.

## Tech Stack

- **Frontend**: React 18 + Vite + Ant Design 5
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Crawling**: Puppeteer + Cheerio
- **Deploy**: Vercel (client) + Render.com (server)

## Project Structure

```
CapNhatGia/
├── server/          # Backend API + Crawl Engine
├── client/          # Frontend React App
├── specs/           # Spec-Driven Development docs
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20.x LTS
- MongoDB Atlas account

### Server
```bash
cd server
cp .env.example .env    # Configure your env variables
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

## Specs
- [Mission](./specs/mission.md)
- [Tech Stack](./specs/tech-stack.md)
- [Roadmap](./specs/roadmap.md)
