# CapNhatGia — Roadmap Spec

## Phương pháp: Spec-Driven Development

Mỗi Sprint/Phase sẽ:
1. Có **mục tiêu rõ ràng** và **deliverables cụ thể**
2. Kết thúc bằng một **milestone có thể demo được**
3. Được thực hiện qua **1 hoặc nhiều conversation/prompt sessions**
4. Có **acceptance criteria** để verify trước khi next phase

---

## Phase 0: Foundation ⏳
**Goal**: Setup project structure, database, và base configuration  
**Sessions**: 1  

### Deliverables
- [x] Init Git repo + `.gitignore`
- [x] Server: `package.json`, Express boilerplate, env config
- [x] Client: Vite + React + Ant Design boilerplate
- [x] MongoDB Atlas connection
- [x] Project structure theo tech-stack spec
- [x] Base middleware (CORS, error handler, morgan)
- [x] README.md

### Acceptance Criteria
- `npm run dev` chạy được cả server + client
- Server kết nối thành công tới MongoDB Atlas
- Client hiển thị trang trắng có Ant Design loaded

---

## Phase 1: Auth & User Management 🔒
**Goal**: Hệ thống authentication + admin quản lý user  
**Sessions**: 1  

### Deliverables
- [x] User model (username, email, password, role)
- [x] Auth routes: login, me
- [x] JWT middleware
- [x] Admin middleware (role check)
- [x] Admin route: create user, list users, update user, deactivate user
- [x] Seed script: tạo admin account mặc định
- [x] Client: Login page
- [x] Client: Auth context + protected routes
- [x] Client: Admin layout + User Management page

### Acceptance Criteria
- Admin login thành công → redirect về dashboard
- Admin tạo user mới → user login được
- Non-admin không access được admin routes
- JWT token refresh hoạt động
- UI: Login page + User management table hoàn chỉnh

---

## Phase 2: Property Data Model & API 🏠
**Goal**: CRUD cho properties + filter/search/pagination  
**Sessions**: 1  
**Ref**: [property-valuation-data.md](./property-valuation-data.md) — Property Schema Update section

### Deliverables
- [x] Property model với full schema (bao gồm 5 nhóm data: `land`, `building`, `legal`, `location`, `amenities`)
- [x] Property routes: list (paginated), detail, stats
- [x] Filter logic: province, district, ward, price range, area range
- [x] Full-text search theo địa chỉ
- [x] Sort: giá, ngày đăng, diện tích
- [x] Seed script: sample properties cho development
- [x] Client: PropertyListPage với tabs skeleton
- [x] Client: PropertyCard component
- [x] Client: PropertyFilters component (cascading location dropdown)
- [x] Client: Pagination

### Acceptance Criteria
- [x] API trả về properties có pagination (page, limit, total)
- [x] Filter theo khu vực hoạt động (cascading: TP → Quận → Phường)
- [x] Filter theo khoảng giá, diện tích hoạt động
- [x] Search theo địa chỉ trả kết quả chính xác
- [x] UI: Cards hiển thị đẹp, responsive, có pagination

---

## Phase 3: Bookmark System 🔖
**Goal**: User bookmark/theo dõi BĐS  
**Sessions**: 1  

### Deliverables
- [x] Bookmark model
- [x] Bookmark routes: add, remove, list (per user)
- [x] BookmarkButton component (toggle heart icon)
- [x] Tab "Đang Theo Dõi" trong PropertyListPage
- [x] Bookmark count hiển thị trên card
- [x] Custom hook `useBookmark`
- [x] Property Details Page

### Acceptance Criteria
- User bookmark BĐS → icon heart đổi trạng thái
- Tab "Đang theo dõi" hiển thị đúng BĐS đã bookmark
- Bookmark isolated per user (user A không thấy bookmark của user B)
- Unbookmark hoạt động

---

## Phase 4: Crawl Engine & DOM Learner 🕷️
**Goal**: Core crawling system — DOM analysis + data extraction  
**Sessions**: 2-3 (phase phức tạp nhất)  

### Phase 4a: DOM Learner Service
- [ ] Puppeteer setup (stealth mode)
- [ ] DOM analysis algorithm:
  - Tìm repeating patterns (listing containers)
  - Detect price/area/phone patterns via regex
  - Score + rank container candidates
  - Extract sample data
- [ ] API endpoint: POST `/api/crawl/learn` → trả về suggested selectors + preview
- [ ] Client: CrawlConfigPage — URL input + DOM analysis results display

### Phase 4b: Crawl Engine
- [ ] CrawlConfig model
- [ ] Crawl engine: navigate → extract → parse
- [ ] Pagination handling (URL param, next button, infinite scroll)
- [ ] Data normalization (address, price, area)
- [ ] API endpoints: POST `/api/crawl/test`, POST `/api/crawl/configs`
- [ ] Client: Test crawl preview + save config flow

### Phase 4c: Data Validation & Deduplication
**Ref**: [property-valuation-data.md](./property-valuation-data.md) — Crawl Patterns & NLP sections

- [ ] DataValidator service:
  - Required fields check
  - Address normalization (Vietnam provinces/districts mapping)
  - Price format parsing ("2 tỷ", "35 triệu/m²", etc.)
  - Phone number cleanup
  - **Land info extraction**: mặt tiền, chiều sâu, hình thể, hướng (regex from spec)
  - **Building info extraction**: số tầng, kết cấu, tình trạng, năm xây (regex from spec)
  - **Legal info extraction**: sổ đỏ/hồng, chính chủ, quy hoạch (regex from spec)
  - **Location info extraction**: đường rộng, hẻm, xe hơi vào (regex from spec)
  - **NLP from description**: parse unstructured text cho các fields không có structured selector
- [ ] Deduplicator service:
  - Content hash generation
  - Upsert logic (update if newer, skip if same)
- [ ] DataCompletenessScore calculator
- [ ] Integration test với batdongsan.com.vn

### Acceptance Criteria
- Admin nhập URL batdongsan.com.vn → DOM learner trả về selectors hợp lý
- Admin chỉnh selectors → test crawl → preview data chính xác
- Save config → config xuất hiện trong list
- Crawl lại cùng URL → không tạo duplicates
- Giá "2.5 tỷ" parse thành 2500 (triệu VNĐ)
- Diện tích "65 m²" parse thành 65

---

## Phase 5: Scheduler & Auto Crawl ⏰
**Goal**: Tự động crawl theo schedule + on-demand trigger  
**Sessions**: 1  

### Deliverables
- [ ] Scheduler service (node-cron, mỗi 15 phút)
- [ ] Crawl all active configs sequentially
- [ ] Logging: crawl results, errors, duration
- [ ] API: trigger single config / trigger all
- [ ] Client: ConfigListPage — bảng configs + actions (edit, delete, toggle, trigger)
- [ ] Crawl status/history hiển thị trên admin

### Acceptance Criteria
- Scheduler chạy tự động mỗi 15 phút
- Trigger on-demand qua admin UI hoạt động
- Config list hiển thị last crawled time + total crawled
- Error logging khi crawl fail

---

## Phase 6: Good Price Detection 💰
**Goal**: Phát hiện BĐS giá hời  
**Sessions**: 1  
**Ref**: [property-valuation-data.md](./property-valuation-data.md) — Hệ số điều chỉnh giá sections

### Deliverables
- [ ] PriceAnalyzer service:
  - Aggregate giá trung bình/m² theo district + ward
  - Compare property price vs area average
  - **Áp dụng hệ số điều chỉnh**: pháp lý (sổ, quy hoạch) + vị trí (hẻm, mặt tiền) + đất (hình thể)
  - Mark goodPrice = true nếu thấp hơn trung bình (sau điều chỉnh)
  - Tính goodPricePercent (% thấp hơn)
  - Tính DataCompletenessScore → hiển thị độ tin cậy định giá
- [ ] Daily cron job (2AM) để recalculate tất cả
- [ ] API: GET `/api/properties/good-price`
- [ ] API: GET `/api/properties/stats` (thống kê giá theo khu vực)
- [ ] Client: Tab "Giá Hời" trong PropertyListPage
- [ ] Client: Badge "Giá Hời" + % trên PropertyCard
- [ ] Client: DataCompletenessScore indicator trên PropertyCard
- [ ] Client: Thống kê giá khu vực (optional chart)

### Acceptance Criteria
- Properties có giá < trung bình khu vực → goodPrice = true
- Tab "Giá Hời" chỉ hiển thị goodPrice properties
- Badge hiển thị đúng % chênh lệch
- Recalculate daily hoạt động
- Khu vực < 3 properties → không tính goodPrice (insufficient data)

---

## Phase 7: Facebook Manual Import 📋
**Goal**: Admin paste Facebook post content → parse thành property  
**Sessions**: 1  

### Deliverables
- [ ] Facebook content parser:
  - Input: raw text hoặc HTML copy từ FB
  - Extract: address, price, area, phone, images
  - Use regex + NLP patterns cho Vietnamese BĐS posts
- [ ] API endpoint: POST `/api/crawl/import-facebook`
- [ ] Client: Facebook import form trong admin
- [ ] Preview + edit trước khi save

### Acceptance Criteria
- Paste nội dung post FB → parse ra được address, price, area
- Admin review + chỉnh sửa trước khi save
- Data saved đúng vào Property collection

---

## Phase 8: Polish & Deploy 🚀
**Goal**: UI polish, performance, deploy production  
**Sessions**: 1-2  

### Deliverables
- [ ] UI/UX polish:
  - Responsive design (mobile-friendly)
  - Loading states, empty states, error states
  - Animations & transitions
  - Dark mode (optional)
- [ ] Performance:
  - API response caching
  - Lazy loading images
  - Virtual scrolling cho large lists
- [ ] Security:
  - Rate limiting
  - Input sanitization
  - Helmet headers
- [ ] Deploy:
  - Server → Render.com (render.yaml)
  - Client → Vercel (vercel.json)
  - MongoDB Atlas connection string in env
  - CI/CD via Git push
- [ ] README cập nhật deploy instructions

### Acceptance Criteria
- App live trên production URLs
- Responsive trên mobile/tablet
- Performance: page load < 2s
- No security warnings

---

## Phase Summary

| Phase | Tên | Sessions | Dependencies |
|-------|-----|----------|-------------|
| 0 | Foundation | 1 | — |
| 1 | Auth & Users | 1 | Phase 0 |
| 2 | Property Data & UI | 1 | Phase 1 |
| 3 | Bookmark System | 1 | Phase 2 |
| 4 | Crawl Engine & DOM Learner | 2-3 | Phase 2 |
| 5 | Scheduler & Auto Crawl | 1 | Phase 4 |
| 6 | Good Price Detection | 1 | Phase 4 |
| 7 | Facebook Import | 1 | Phase 4 |
| 8 | Polish & Deploy | 1-2 | All |

**Tổng ước tính: 10-12 sessions**

---

## How to Use This Roadmap

Mỗi khi bắt đầu session mới, hãy:
1. Tham khảo file này để biết đang ở Phase nào
2. Check deliverables checklist của Phase hiện tại
3. Khi hoàn thành Phase → check acceptance criteria
4. Cập nhật checklist (đánh `[x]`) trước khi chuyển Phase tiếp theo

> [!TIP]
> Dùng prompt: *"Tiếp tục Phase X của CapNhatGia"* để resume development.
