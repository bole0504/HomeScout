# Brainstorming Phase 4: Crawl Engine & Data Collection

## Tổng quan
Phase 4 là cốt lõi của ứng dụng, chịu trách nhiệm thu thập dữ liệu bất động sản từ các nguồn bên ngoài (đặc biệt là batdongsan.com.vn) để xây dựng database cho việc định giá.

## 1. Phương pháp thu thập dữ liệu (Data Acquisition Methods)

### A. DOM Scraping (Puppeteer/Playwright) - *Đã có trong roadmap*
- **Ưu điểm**: Linh hoạt, có thể lấy bất kỳ thông tin nào hiển thị trên UI, handle được các trang SPA.
- **Nhược điểm**: Nặng, chậm, dễ bị Cloudflare block nếu không setup proxy/stealth mode cẩn thận. Chi phí tài nguyên cao.

### B. Internal API Reverse Engineering - *Ý tưởng mới từ User*
Thay vì parse HTML, chúng ta tìm các endpoint microservice mà website đang dùng để fill dữ liệu.
- **Ví dụ**: `https://batdongsan.com.vn/microservice-architecture-router/Product/ProductSearch/Search`
- **Ưu điểm**: 
  - Tốc độ cực nhanh (trả về JSON).
  - Dữ liệu đã được structured sẵn (không cần regex phức tạp cho từng field cơ bản).
  - Tiết kiệm bandwidth.
- **Nhược điểm**: 
  - Khó tìm endpoint và các tham số (query params, headers).
  - Dễ bị block và yêu cầu Cookie/Token hợp lệ.
  - API có thể thay đổi cấu trúc bất ngờ mà không báo trước.

### C. Mobile App API
Các ứng dụng mobile (iOS/Android) thường gọi về các API ít bị bảo mật hơn web (hoặc bảo mật theo cách khác như SSL Pinning).
- **Cách thực hiện**: Dùng công cụ như Proxyman/Charles để bắt traffic từ app Batdongsan trên điện thoại.
- **Tiềm năng**: Nếu tìm được API cho mobile, việc crawl sẽ ổn định hơn rất nhiều.

### D. RSS & Sitemaps
- **Ưu điểm**: Rất ổn định, là nguồn tin cậy của các search engine.
- **Nhược điểm**: Chỉ có các field cơ bản (Title, Link), không có data chi tiết (số tầng, pháp lý...). Dùng để "discovery" URLs mới rất tốt.

---

## 2. Chiến lược thực hiện với batdongsan.com.vn

Dựa trên thực tế web này dùng Cloudflare và Microservices:

### Bước 1: Discovery (Tìm URL mới)
Sử dụng Sitemap hoặc lướt qua trang danh sách chính bằng API để lấy danh sách Product IDs/Links mới nhất.

### Bước 2: Extraction (Lấy data chi tiết)
- Thử nghiệm gọi trực tiếp API `Search` với các tham số filter.
- Nếu bị block, sử dụng Puppeteer Stealth để "mồi" (warm up) session, lấy Cookie sau đó mới gọi API.
- Nếu API quá khó nhằn, quay lại dùng DOM Scraping cho trang Detail.

### Bước 3: Data Normalization (Chuẩn hóa)
- **Address**: Cần một list Tỉnh/Thành, Quận/Huyện, Phường/Xã chuẩn Việt Nam để mapping.
- **Price**: Normalize về đơn vị Triệu VNĐ hoặc Tỷ VNĐ cố định.
- **Area**: Normalize về m2.
- **NLP**: Dùng Regex hoặc AI (Gemini/GPT) để bóc tách các thông tin "ẩn" trong mô tả (ví dụ: "hẻm xe hơi", "nở hậu", "sổ hồng riêng").

---

## 3. Các thành phần kỹ thuật cần bổ sung

1. **Proxy Manager**: Để xoay vòng IP tránh bị ban.
2. **User-Agent Rotator**: Giả lập nhiều trình duyệt khác nhau.
3. **Session Store**: Lưu trữ Cookies/Tokens từ các phiên browser thành công để dùng cho API calls.
4. **Data Cleaner**: Module xử lý rác (junk data, tin rác, tin trùng lặp).

---

## 4. Cải tiến Roadmap Phase 4

Dựa trên brainstorm, chúng ta có thể điều chỉnh Phase 4 như sau:

- **Phase 4a**: **Explorer & API Discovery** (Thay vì chỉ DOM Learner). Tìm kiếm endpoint API và test khả năng gọi script.
- **Phase 4b**: **Hybrid Crawl Engine**. Kết hợp API (cho listing) và DOM (cho detail) để tối ưu.
- **Phase 4c**: **Smart Parsing**. Tích hợp NLP nhẹ để trích xuất thuộc tính từ text mô tả.

---

## Câu hỏi cần làm rõ:
1. Bạn muốn ưu tiên lấy data ở quy mô lớn (toàn quốc) hay tập trung sâu vào 1 khu vực (ví dụ: TP.HCM)?
2. Bạn có sẵn sàng sử dụng các dịch vụ Proxy trả phí nếu việc crawl bị Cloudflare chặn gắt gao không?
3. Chúng ta nên tập trung vào việc tạo ra một "Crawl Tool" (Admin tự config) hay một "Auto Crawler" (Code cứng cho 1 số site)?


---------

1. **Quy mô**: Tập trung toàn quốc. Ưu tiên hàng đầu là lấy được data thành công.
2. **Chi phí Proxy thực tế (Tham khảo)**: 
   - Các dịch vụ như **Bright Data** hoặc **Zyte** thường tính theo lưu lượng (GB) hoặc số lượng request thành công.
   - *Proxy Dân cư (Residential)*: Khoảng $10-$15/GB. Đây là loại khó bị block nhất vì IP trông giống người dùng thật.
   - *Proxy Trung tâm dữ liệu (Datacenter)*: Rẻ hơn, khoảng $0.5-$1.0/IP/tháng, nhưng dễ bị Cloudflare nhận diện.
   - *Kết luận*: Hiện tại chúng ta sẽ tập trung vào việc crawl "sạch" (không proxy), tối ưu hóa Header/Session và chọn các trang ít bảo mật trước để demo.

3. **Mô tả chi tiết: Crawl Tool (Admin Config) vs. Auto Crawler**

### Cách A: Auto Crawler (Code cứng - Hard-coded)
- **Cơ chế**: Viết code riêng cho từng website (ví dụ: `batdongsan.js`, `alonhadat.js`). Mỗi file chứa logic chọn selector (`.product-title`, `.price`, ...).
- **Ưu điểm**: Chạy rất chính xác cho site đó, xử lý được các case phức tạp (ví dụ: cần click vào nút "Hiện số điện thoại").
- **Nhược điểm**: Mỗi khi website đổi giao diện (đổi tên class), developer phải vào sửa code và deploy lại server. Khó mở rộng lên hàng trăm site.

### Cách B: Crawl Tool (Admin Config) - *Đề xuất*
- **Cơ chế**: Xây dựng một giao diện Admin cho phép bạn nhập URL và các "Luật" (Rules).
  - Bạn chỉ cần nhập vào bảng: `Tiêu đề` -> selector `#product-detail h1`.
  - Hệ thống sẽ lưu các Rule này vào Database (Model `CrawlConfig`).
- **Ưu điểm**: 
  - **Linh hoạt**: Khi website đổi giao diện, bạn (Admin) chỉ cần vào UI cập nhật lại selector là xong, không cần gọi dev.
  - **Mở rộng cực nhanh**: Bạn có thể tự thêm 10-20 website mới chỉ bằng cách copy-paste selectors từ trình duyệt vào Admin UI.
- **Tính năng "DOM Learner"**: Chúng ta sẽ tích hợp một script giúp hệ thống tự động "gợi ý" các selector này khi bạn nhập URL, giúp việc cấu hình nhanh hơn nữa.

---

## Bước tiếp theo cho Phase 4:
Chúng ta sẽ bắt đầu thực hiện theo hướng **Crawl Tool (Admin Config)**:
- **4.1**: Xây dựng UI Admin để quản lý danh sách Config (URL, Tên site, Mapping selectors).
- **4.2**: Phát triển Crawl Engine (Puppeteer) có khả năng đọc dynamic config từ DB để extract dữ liệu.
- **4.3**: Thử nghiệm (Test Run) với các site mục tiêu (Bắt đầu với `batdongsan.com.vn` và 1-2 site dễ hơn).