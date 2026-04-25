# Security Specification for SEO Field Manager

## 1. Data Invariants
- Một nhân viên ('employee') chỉ có thể xem công việc được giao cho chính họ.
- Một admin có thể xem tất cả nhân viên và tất cả công việc.
- Dữ liệu vị trí ('/locations') chỉ được ghi bởi chính nhân viên đó và chỉ có admin hoặc chính nhân viên đó mới được đọc.
- Hồ sơ người dùng ('/users') chỉ được cập nhật bởi chính người dùng (cho các field cho phép) hoặc admin.
- Phân quyền (role) trong hồ sơ người dùng KHÔNG được tự ý thay đổi bởi người dùng thường.

## 2. The "Dirty Dozen" Payloads (Attacks)

1. **Self-Promotion**: Một employee cố gắng cập nhật role của mình thành 'admin'.
2. **Identity Spoofing**: Một user cố gắng tạo hồ sơ người dùng với `uid` của người khác.
3. **Data Scraping**: Một employee cố gắng truy vấn tất cả hồ sơ người dùng trong hệ thống.
4. **Task Hijacking**: Một employee cố gắng đánh dấu hoàn thành một task không thuộc về họ.
5. **Location Forgery**: Một admin giả mạo (cố gắng ghi dữ liệu vào `/locations` với `userId` của người khác - mặc dù admin thường có quyền cao, nhưng ghi log vị trí thay người khác là sai invariant).
6. **Hidden Fields**: Gửi thêm field `isVerified: true` vào hồ sơ khi đăng ký.
7. **Task Modification**: Nhân viên cố gắng thay đổi `deadline` của task được giao (chỉ admin mới có quyền).
8. **Unauthorized Task Creation**: Nhân viên cố gắng tự tạo task cho chính mình (chỉ admin mới được tạo task).
9. **Query Scoping Bypass**: Cố gắng truy cập `/tasks` mà không có filter `assignedTo`.
10. **Resource Exhaustion**: Gửi một chuỗi cực dài (1MB) vào `title` của task.
11. **Orphaned Location**: Ghi dữ liệu vào `/locations` với một `userId` không tồn tại trong `/users`.
12. **Future Poisoning**: Gửi task với `createdAt` là một thời điểm trong tương lai.

## 3. Test Runner Design (Conceptual)
Các test case sẽ kiểm tra `deny` cho tất cả các payload trên.
- `create` User với role 'admin' bởi user mới -> DENY.
- `update` User field 'role' bởi chính user đó -> DENY.
- `list` Users bởi employee -> DENY.
- `write` Task bởi employee -> DENY.
