# 🎓 School Attendance System - Hệ Thống Điểm Danh Sinh Viên

> Hệ thống ghi nhận điểm danh tự động, hỗ trợ quét mã QR / Web Check-in nhanh chóng, chính xác và ngăn chặn gian lận điểm danh theo thời gian thực.

---

## 🌟 Giới Thiệu Sản Phẩm

**School Attendance System** là giải pháp phần mềm hỗ trợ nhà trường, giảng viên và cán bộ quản lý lớp học tự động hóa toàn bộ quy trình điểm danh truyền thống:
* **Nhanh chóng & Tiện lợi:** Sinh viên quét mã QR hoặc truy cập đường link để điền thông tin xác nhận có mặt chỉ trong vài giây.
* **Tự động bắt giờ thực:** Loại bỏ việc nhập giờ thủ công, server tự động ghi nhận thời gian thực tế ngay khi nhấn nút.
* **Phân loại chuyên cần tự động:** Tự động đối chiếu mốc giờ quy định (ví dụ `07:30 AM`) để phân loại trạng thái **Đúng giờ (`ON_TIME`)** hoặc **Đi muộn (`LATE`)**.
* **Chống gian lận & Trùng lặp:** Hệ thống kiểm tra và tự động khóa, ngăn không cho một sinh viên điểm danh nhiều lần trong cùng một buổi học.

---

## 🚀 Các Tính Năng Nổi Bật

| Tính năng | Mô tả chi tiết |
| :--- | :--- |
| **Giao diện Check-in** | Thiết kế tối giản, tương thích tốt trên cả máy tính lẫn điện thoại di động. |
| **Ghi nhận thời gian thực** | Sử dụng thời gian hệ thống phía Backend (`LocalDateTime`), đảm bảo tính minh bạch, không thể can thiệp từ client. |
| **Phân loại tự động** | Tự động gắn nhãn: <br>• `ON_TIME`: Check-in trước mốc quy định. <br>• `LATE`: Check-in sau mốc quy định. |
| **Chống điểm danh lặp** | Kiểm tra theo ngày và mã số sinh viên (MSSV); từ chối các lượt submit thứ 2 trở đi trong ngày. |
| **Lưu trữ dữ liệu tức thì** | Đồng bộ trực tiếp vào cơ sở dữ liệu MySQL, sẵn sàng cho việc trích xuất và thống kê. |

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
