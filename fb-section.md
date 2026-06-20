File .fb-session.json cũ chỉ có 7 cookies tracking (dpr, sb, fr...) — thiếu c_user và xs là 2 cookies xác thực thật của FB. Session này là anonymous, không login được. Code vẫn crawl được vì group bạn dùng là public (không cần login).

Những gì đã sửa
1. _isLoggedIn() trong FBCrawlService.js — Kiểm tra c_user + xs cookie trực tiếp thay vì dựa vào DOM (DOM của public group không có login form → false positive).

2. Headless mode — Trước: headless nếu có file session. Sau: headless chỉ khi session có auth cookies thật. Nếu session không hợp lệ thì mở browser visible để user xử lý.

3. Thêm 3 API endpoints mới trong crawl.js:

GET /api/crawl/fb/session-status — kiểm tra trạng thái login
POST /api/crawl/fb/set-session — import cookies từ browser
DELETE /api/crawl/fb/session — xóa session
Cách fix hoàn toàn (để crawl được group cần login)
Facebook chặn automated login rất mạnh. Cách an toàn nhất là copy cookies từ trình duyệt đang login sẵn:

Cài extension Cookie Editor (Chrome/Firefox)
Đăng nhập Facebook trên trình duyệt bình thường
Mở Cookie Editor → Export (JSON format)
Gọi API:
POST /api/crawl/fb/set-session
Body: { "cookies": [...paste JSON từ Cookie Editor...] }
Hoặc dùng cookie string từ DevTools (F12 → Application → Cookies → copy giá trị Cookie header):

POST /api/crawl/fb/set-session
Body: { "cookieString": "c_user=12345; xs=abcdef; ..." }