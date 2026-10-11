# Tài liệu khảo sát: Luồng Đặt - Đổi - Hủy Booking (Model-Based)

**Người phụ trách:** Nguyễn Hoàng Hiếu Nghĩa (@2212426-create)
**Nhánh khảo sát:** `qa/model-based-booking`
**Mã SHA khảo sát:** `a43ab82`
**Tài liệu liên kết:** [Tài liệu Issue 01](https://github.com/BoyTay/cal.diy/blob/main/docs/qa/issue-01.md)

---

## 1. Sơ đồ luồng dữ liệu (Data Flow)
*Ghi chú: Các nhánh điều kiện [Đọc từ code] được phân tích từ mã nguồn; các trạng thái cập nhật [Đã chạy thử] đã được kiểm chứng hành vi thực tế qua localhost:3000.*

```mermaid
graph TD
    Start([Khách hàng Submit Form]) --> API_Create(API: Create Booking)
    
    %% Create Flow
    API_Create --> CheckCreate{Kiểm tra điều kiện <br> [Đọc từ code]}
    CheckCreate -->|Lỗi: Trùng giờ, Spam, <br> Email bị Blacklist| RejectCreate[Từ chối: Throw Error]
    CheckCreate -->|Hợp lệ| DB_Create[(Database: Bảng Booking)]
    DB_Create -->|Tạo mới: status = PENDING/ACCEPTED <br> [Đã chạy thử]| WebhookEmail([Kích hoạt Webhook / Gửi Email])
    
    %% Phân nhánh sau khi tạo
    WebhookEmail --> Action_Reschedule(Khách hàng Yêu cầu Đổi lịch)
    WebhookEmail --> Action_Cancel(Khách hàng Yêu cầu Hủy)
    
    %% Reschedule Flow
    Action_Reschedule --> API_Reschedule(API: rescheduleBooking)
    API_Reschedule --> CheckReschedule{Kiểm tra điều kiện <br> [Đọc từ code]}
    CheckReschedule -->|Lỗi: Vi phạm minimumRescheduleNotice, <br> Kín slot| RejectReschedule[Từ chối: Throw Error]
    CheckReschedule -->|Hợp lệ| DB_Reschedule[(Database: Bảng Booking)]
    DB_Reschedule -->|Cập nhật record cũ: status = RESCHEDULED, rescheduled = true <br> Tạo record mới: fromReschedule = uid cũ <br> [Đã chạy thử]| SuccessReschedule([Hoàn tất Đổi lịch])
    
    %% Cancel Flow
    Action_Cancel --> API_Cancel(API: cancelBooking)
    API_Cancel --> CheckCancel{Kiểm tra quyền & Trạng thái <br> [Đọc từ code]}
    CheckCancel -->|Lỗi: Đã hủy trước đó, <br> Thiếu thẩm quyền| RejectCancel[Từ chối: Throw Error]
    CheckCancel -->|Hợp lệ| DB_Cancel[(Database: Bảng Booking)]
    DB_Cancel -->|Cập nhật: status = CANCELLED <br> Lưu: cancellationReason & cancelledBy <br> [Đã chạy thử]| SuccessCancel([Hoàn tất Hủy lịch])
```

---

## 2. Chi tiết Module, Route và Models Dữ liệu

### 2.1. Luồng Đặt (Create Booking)
- **Module / Route xử lý:** `addBookingHandler`
- **Đường dẫn mã nguồn:** [`packages/trpc/server/routers/viewer/bookings/addBooking.handler.ts`](https://github.com/BoyTay/cal.diy/blob/a43ab82/packages/trpc/server/routers/viewer/bookings/addBooking.handler.ts)
- **Models dữ liệu liên quan:**
  - `Booking`: Lưu bản ghi lõi (uid, startTime, endTime, status).
  - `Attendee`: Bảng liên kết khách tham dự.
- **Điều kiện từ chối/lỗi (Validation trong code):** 
  - Trùng lặp/Xung đột thời gian với sự kiện đã có.
  - Khách hàng sử dụng email nằm trong mảng `BLACKLISTED_GUEST_EMAILS`.
  - Vi phạm giới hạn đặt lịch của Host (Booking limits).

### 2.2. Luồng Đổi (Reschedule Booking)
- **Module / Route xử lý:** API xử lý reschedule thông qua `handleReschedule`.
- **Đường dẫn mã nguồn:** [`packages/features/bookings/lib/handleReschedule.ts`](https://github.com/BoyTay/cal.diy/blob/a43ab82/packages/features/bookings/lib/handleReschedule.ts)
- **Models dữ liệu liên quan:**
  - `Booking` (Cũ): Cập nhật `status = RESCHEDULED` và `rescheduled = true`.
  - `Booking` (Mới): Khởi tạo mới, trường `fromReschedule` lưu UID của booking cũ.
- **Điều kiện từ chối/lỗi (Validation trong code):** 
  - Vi phạm thời gian thông báo tối thiểu (`minimumRescheduleNotice` trong event type).
  - Khung giờ yêu cầu chuyển đến không khả dụng (busy).

### 2.3. Luồng Hủy (Cancel Booking)
- **Module / Route xử lý:** API hủy booking `handleCancelBooking`.
- **Đường dẫn mã nguồn:** [`packages/features/bookings/lib/handleCancelBooking.ts`](https://github.com/BoyTay/cal.diy/blob/a43ab82/packages/features/bookings/lib/handleCancelBooking.ts)
- **Models dữ liệu liên quan:**
  - `Booking`: Cập nhật `status = CANCELLED`, lưu lý do vào `cancellationReason` và `cancelledBy`.
- **Điều kiện từ chối/lỗi (Validation trong code):** 
  - Lỗi `BOOKING_ALREADY_CANCELLED`: Bản ghi đã bị hủy từ trước.
  - Lỗi phân quyền: Khách thao tác không có thẩm quyền trên UID này.
