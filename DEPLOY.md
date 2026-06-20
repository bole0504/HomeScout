# Deploy & Update Guide

VPS: `165.22.109.245` — Ubuntu 24.04, 512MB RAM  
Repo: https://github.com/bole0504/HomeScout.git

---

## Update khi có thay đổi

### Nếu chỉ thay đổi server (API, services, routes...)

```bash
# 1. Push code lên GitHub (máy local)
git add .
git commit -m "..."
git push origin main

# 2. SSH vào VPS
ssh root@165.22.109.245

# 3. Pull code mới
cd /var/www/capnhatgia
git pull origin main

# 4. Restart server
pm2 restart capnhatgia
```

---

### Nếu có thay đổi client (UI, components, pages...)

```bash
# 1. Build local (KHÔNG build trên VPS — RAM không đủ)
cd /Users/ducle/Desktop/DEV/CapNhatGia/client
npm run build

# 2. Upload dist lên VPS
scp -r dist/ root@165.22.109.245:/var/www/capnhatgia/client/

# 3. Nếu server cũng có thay đổi thì push + pull + restart như trên
```

---

### Nếu thay đổi cả server lẫn client

```bash
# Local
git add . && git commit -m "..." && git push origin main
cd client && npm run build
scp -r dist/ root@165.22.109.245:/var/www/capnhatgia/client/

# VPS
ssh root@165.22.109.245
cd /var/www/capnhatgia && git pull origin main
pm2 restart capnhatgia
```

---

## Kiểm tra sau khi update

```bash
pm2 status              # server có đang chạy không
pm2 logs capnhatgia     # xem log lỗi nếu có
curl http://localhost:5001/api/health   # test API
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
