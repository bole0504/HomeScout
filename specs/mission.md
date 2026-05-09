# CapNhatGia — Mission Spec

## Vision

Xây dựng hệ thống theo dõi và cập nhật giá bất động sản tự động, giúp nhà đầu tư nhanh chóng phát hiện các cơ hội **giá hời** trên thị trường Việt Nam.

---

## Problem Statement

Thị trường BĐS Việt Nam thiếu minh bạch. Thông tin nằm rải rác trên nhiều website rao bán và group Facebook. Nhà đầu tư phải:
- Theo dõi thủ công hàng chục nguồn mỗi ngày
- Tự so sánh giá giữa các BĐS cùng khu vực
- Không có công cụ cảnh báo khi xuất hiện BĐS giá tốt
- Dễ bỏ lỡ cơ hội vì thông tin quá tải

---

## Solution

**CapNhatGia** — hệ thống tập trung hóa dữ liệu BĐS từ nhiều nguồn:

### Core Capabilities

1. **Automated Crawling**
   - Crawl tự động từ các website BĐS mỗi 15 phút
   - Admin cấu hình URL nguồn + DOM selectors thông qua giao diện DOM Learning
   - Support manual import cho Facebook Group content

2. **Smart Data Processing**
   - Validate dữ liệu: đảm bảo có đầy đủ thông tin địa chỉ
   - Deduplication: tránh trùng lặp khi crawl lặp lại
   - Normalize: chuẩn hóa địa chỉ, giá cả, diện tích

3. **Good Price Detection**
   - Tính giá trung bình/m² theo từng khu vực (Quận + Phường)
   - BĐS có giá thấp hơn trung bình khu vực → đánh dấu **goodPrice**
   - Recalculate tự động mỗi ngày 1 lần

4. **User Experience**
   - Danh sách BĐS dạng card với pagination
   - Filter theo khu vực, giá, diện tích
   - Tab riêng cho BĐS giá hời và BĐS đang theo dõi
   - Bookmark system per-user

5. **Admin Panel**
   - Quản lý crawl configs (thêm URL, DOM learning, test crawl)
   - Quản lý danh sách configs đã lưu
   - Quản lý users (chỉ admin tạo account)

---

## Target Users

| Role | Mô tả |
|------|--------|
| **Admin** | Quản trị viên: cấu hình crawl, quản lý users, duyệt dữ liệu |
| **User** | Nhà đầu tư/người xem: xem BĐS, filter, bookmark, theo dõi giá hời |

---

## Key Constraints

- **Không đăng ký mở**: Chỉ admin tạo account cho users
- **Facebook**: Manual import DOM content (không tự động crawl FB)
- **Deployment**: Frontend → Vercel, Backend → Render.com
- **Database**: MongoDB Atlas (cloud)
- **Pháp lý**: Chỉ crawl dữ liệu công khai, tuân thủ robots.txt

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Crawl data mới | Mỗi 15 phút/nguồn |
| Duplicate rate | < 5% |
| Good Price recalc | Mỗi ngày 1 lần |
| Page load time | < 2s |
| Admin config URL → crawl | < 5 phút workflow |
