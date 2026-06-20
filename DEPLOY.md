# Deploy & Update Guide

## Kiến trúc

```
User / PWA
  │
  ├─► https://home-scout-one.vercel.app   (Vercel — Frontend React)
  │       /api/* → proxy → VPS:5001       (transparent, không cần domain riêng)
  │
  └─► http://165.22.109.245:5001          (VPS — Backend Node.js)
```

---

> Accounts & credentials xem trong file `CREDENTIALS.md` (không được commit).

---

## Deploy client (Vercel)

Client deploy tự động khi push lên GitHub nếu đã kết nối Vercel với repo.  
Hoặc deploy thủ công:

```bash
cd /Users/ducle/Desktop/DEV/CapNhatGia/client
npx vercel --prod
```

> **Lưu ý:** Client dùng Vercel Rewrite để proxy `/api/*` về VPS.  
> Không cần set `VITE_API_URL` — mặc định `/api` là đúng.  
> Không cần domain hay Cloudflare.

---

## Update khi có thay đổi

### Chỉ thay đổi server (API, services, routes...)

```bash
# Local — push code
git add .
git commit -m "..."
git push origin main

# VPS — pull và restart
ssh root@165.22.109.245
cd /var/www/capnhatgia
git pull origin main
pm2 restart capnhatgia
```

### Chỉ thay đổi client (UI, components, pages...)

```bash
# Deploy lên Vercel (build tự động trên Vercel)
git add .
git commit -m "..."
git push origin main
# Vercel tự build và deploy, xong sau ~1 phút
```

Hoặc deploy thủ công không qua git:
```bash
cd /Users/ducle/Desktop/DEV/CapNhatGia/client
npx vercel --prod
```

### Thay đổi cả server lẫn client

```bash
# Local
git add . && git commit -m "..." && git push origin main

# VPS
ssh root@165.22.109.245
cd /var/www/capnhatgia && git pull origin main
pm2 restart capnhatgia

# Client tự deploy trên Vercel sau khi push git
```

---

## Kiểm tra sau khi update

```bash
# Kiểm tra API qua Vercel proxy (production)
curl https://home-scout-one.vercel.app/api/health

# Kiểm tra API trực tiếp trên VPS
curl http://165.22.109.245:5001/api/health

# Xem log server
ssh root@165.22.109.245
pm2 logs capnhatgia
pm2 logs capnhatgia --lines 100
```

---

## Các lệnh PM2 thường dùng

```bash
pm2 status              # xem tất cả process
pm2 restart capnhatgia  # restart server
pm2 stop capnhatgia     # dừng server
pm2 logs capnhatgia     # xem log realtime
pm2 logs capnhatgia --lines 100   # xem 100 dòng log gần nhất
```

---

## Cấu hình quan trọng

### server/.env (trên VPS)
```
NODE_ENV=production
CLIENT_URL=https://home-scout-one.vercel.app
PORT=5001
```

### client/vercel.json
- `/api/*` → proxy về `http://165.22.109.245:5001/api/*`
- `/*` → `index.html` (SPA routing)
