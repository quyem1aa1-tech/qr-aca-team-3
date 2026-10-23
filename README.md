# 🎓 School Attendance System - Hệ Thống Điểm Danh Sinh Viên

> Hệ thống ghi nhận điểm danh tự động, hỗ trợ quét mã QR / Web Check-in nhanh chóng, chính xác và ngăn chặn gian lận điểm danh theo thời gian thực.

---

## 🛠 Công Nghệ Sử Dụng

* **Frontend:** React.js, Vite, Modern CSS UI
* **Backend:** Java Spring Boot, Spring Data JPA, Hibernate, Maven
* **Database:** MySQL
* **Môi trường:** Linux / WSL (Ubuntu), Node.js, OpenJDK

---

## ⚡ Quick Access (Dành Cho Thành Viên Nhóm)

```bash
# Chuyển ngay sang nhánh dev để làm việc
git checkout dev && git pull origin dev
```

---

## 📖 Hướng Dẫn Vận Hành Nhanh (Dành Cho Demo)


### 2. Khởi động Cơ sở dữ liệu (MySQL)
Đảm bảo dịch vụ MySQL đang chạy và đã tạo database `school_attendance`:
```bash
sudo service mysql start
```
### 3. Khởi động Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run

Server API lắng nghe tại: http://localhost:8080
```

### 4. Khởi động Frontend (React)
```
cd frontend
npm install   # (chỉ cần chạy lần đầu tiên)
npm run dev

Giao diện điểm danh truy cập tại: http://localhost:5173
```
