# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Hệ thống SmartCare

**Phiên bản:** 1.0  
**Ngày:** [TBD]  
**Tác giả:** [TBD]  
**Trạng thái:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Conventions
   - 1.3 Intended Audience and Reading Suggestions
   - 1.4 Project Scope
   - 1.5 References

2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective
   - 2.2 Product Features
   - 2.3 User Classes and Characteristics
   - 2.4 Operating Environment
   - 2.5 Design and Implementation Constraints
   - 2.6 User Documentation
   - 2.7 Assumptions and Dependencies

3. [System Features](#3-system-features)

4. [External Interface Requirements](#4-external-interface-requirements)
   - 4.1 User Interfaces
   - 4.2 Hardware Interfaces
   - 4.3 Software Interfaces
   - 4.4 Communications Interfaces

5. [Other Nonfunctional Requirements](#5-other-nonfunctional-requirements)
   - 5.1 Performance Requirements
   - 5.2 Safety Requirements
   - 5.3 Security Requirements
   - 5.4 Software Quality Attributes

6. [Other Requirements](#6-other-requirements)

[Appendix A: Glossary](#appendix-a-glossary)

[Appendix B: Analysis Models](#appendix-b-analysis-models)

[Appendix C: Issues List](#appendix-c-issues-list)

---

## Revision History

| Phiên bản | Ngày | Tác giả | Mô tả thay đổi |
|-----------|------|--------|----------------|
| 1.0 | [TBD] | [TBD] | Phiên bản đầu tiên |

---

## 1. Introduction

### 1.1 Purpose

Tài liệu Software Requirements Specification (SRS) này mô tả các yêu cầu chức năng và phi chức năng của hệ thống SmartCare. Tài liệu này được sử dụng làm cơ sở cho việc thiết kế, phát triển, kiểm thử và triển khai hệ thống.

SmartCare là một hệ thống quản lý sức khỏe cá nhân được thiết kế để hỗ trợ người dùng theo dõi và quản lý các hoạt động chăm sóc sức khỏe hàng ngày, bao gồm việc uống thuốc, theo dõi bữa ăn, vận động, và các chỉ số sức khỏe khác.

Tài liệu này nhằm phục vụ các đối tượng sau:
- Nhóm phát triển phần mềm
- Nhóm kiểm thử (QA)
- Quản lý dự án
- Các bên liên quan (stakeholders)

### 1.2 Document Conventions

Tài liệu này sử dụng các quy ước sau:

- **TBD (To Be Determined)**: Đánh dấu các nội dung chưa được xác định, cần làm rõ sau
- **REQ-XXX**: Mã số yêu cầu chức năng (Functional Requirement)
- **NFR-XXX**: Mã số yêu cầu phi chức năng (Non-Functional Requirement)
- **In đậm**: Nhấn mạnh các thuật ngữ quan trọng
- *In nghiêng*: Thuật ngữ được định nghĩa trong Glossary

### 1.3 Intended Audience and Reading Suggestions

**Đối tượng đọc tài liệu:**

1. **Business Analyst / Product Owner**: Đọc toàn bộ tài liệu để hiểu rõ yêu cầu nghiệp vụ
2. **Developer**: Tập trung vào phần 3 (System Features) và phần 4 (External Interface Requirements)
3. **QA Tester**: Sử dụng phần 3 (System Features) để viết Test Cases, đặc biệt chú ý các Functional Requirements
4. **Project Manager**: Đọc phần 1 (Introduction) và phần 2 (Overall Description) để nắm tổng quan dự án
5. **Stakeholders**: Đọc phần 2 (Overall Description) và phần 3 (System Features) để hiểu chức năng hệ thống

**Gợi ý đọc:**
- Người mới bắt đầu: Bắt đầu từ phần 1.4 (Project Scope) và 2.2 (Product Features)
- Người cần chi tiết kỹ thuật: Tập trung vào phần 3 và 4
- Người cần hiểu nghiệp vụ: Đọc phần 2 và Appendix B

### 1.4 Project Scope

**Tên dự án:** SmartCare

**Loại hệ thống:** Mobile Application

**Mục đích hệ thống:** 
SmartCare là ứng dụng di động hỗ trợ người dùng quản lý và theo dõi sức khỏe cá nhân một cách hiệu quả. Hệ thống giúp người dùng:
- Nhắc nhở uống thuốc đúng giờ
- Theo dõi bữa ăn và lượng calo
- Ghi nhận các hoạt động vận động
- Theo dõi các triệu chứng sức khỏe
- Nhận tư vấn sức khỏe từ trợ lý AI
- Chia sẻ thông tin sức khỏe với người thân (caregiver)

**Phạm vi trong dự án:**
- Quản lý thông tin người dùng và tài khoản
- Quản lý danh sách thuốc và lịch uống thuốc
- Theo dõi nhật ký sức khỏe (bữa ăn, vận động, triệu chứng)
- Tạo và quản lý lịch hẹn khám bác sĩ
- Tư vấn sức khỏe thông qua trợ lý AI
- Chức năng chăm sóc cho người thân (caregiver)
- Tạo báo cáo sức khỏe định kỳ
- Nhận thông báo nhắc nhở

**Phạm vi ngoài dự án:**
- Chẩn đoán bệnh hoặc đưa ra phác đồ điều trị
- Kết nối trực tiếp với thiết bị y tế (glucometer, blood pressure monitor, etc.)
- Thanh toán trực tuyến
- Đặt lịch khám bác sĩ trực tuyến
- Gửi SMS/Email thông báo (chỉ hỗ trợ thông báo trong ứng dụng)

### 1.5 References

[TBD - Danh sách các tài liệu tham khảo sẽ được bổ sung]

---

## 2. Overall Description

### 2.1 Product Perspective

SmartCare là một ứng dụng độc lập, không phụ thuộc vào các hệ thống bên ngoài khác. Ứng dụng hoạt động trên nền tảng di động và có thể tích hợp với các dịch vụ bên thứ ba như:
- Dịch vụ AI để tư vấn sức khỏe (TBD - cần xác định nhà cung cấp cụ thể)
- Dịch vụ lưu trữ đám mây cho ảnh và dữ liệu (TBD)

**Mối quan hệ với hệ thống khác:**
- Hệ thống không tích hợp trực tiếp với hệ thống bệnh viện hoặc phòng khám
- Hệ thống không kết nối với thiết bị y tế IoT
- Dữ liệu được lưu trữ trên server riêng của ứng dụng

### 2.2 Product Features

Hệ thống SmartCare bao gồm các tính năng chính sau:

**2.2.1 Quản lý tài khoản người dùng**
- Đăng ký tài khoản mới
- Đăng nhập/đăng xuất
- Xác thực tài khoản
- Quản lý thông tin cá nhân
- Quản lý cài đặt thông báo

**2.2.2 Quản lý thuốc và nhắc nhở**
- Thêm/sửa/xóa thông tin thuốc
- Thiết lập lịch uống thuốc (hàng ngày hoặc cách ngày)
- Nhận thông báo nhắc nhở uống thuốc
- Đánh dấu trạng thái đã uống/bỏ qua
- Xem lịch sử uống thuốc

**2.2.3 Theo dõi sức khỏe**
- Ghi nhận bữa ăn và ước tính lượng calo
- Ghi nhận hoạt động vận động và lượng calo tiêu thụ
- Ghi nhận các triệu chứng sức khỏe
- Xem thống kê sức khỏe theo ngày/tuần/tháng

**2.2.4 Quản lý lịch hẹn**
- Tạo lịch hẹn khám bác sĩ
- Xem danh sách lịch hẹn sắp tới
- Nhận thông báo nhắc nhở trước lịch hẹn
- Đánh dấu lịch hẹn đã hoàn thành

**2.2.5 Trợ lý AI tư vấn sức khỏe**
- Chat với trợ lý AI về các vấn đề sức khỏe
- Nhận lời khuyên dựa trên tình trạng sức khỏe cá nhân
- Phân tích đơn thuốc từ ảnh (TBD - cần xác nhận)
- Ước tính lượng calo cho món ăn/vận động

**2.2.6 Chức năng Caregiver (Người chăm sóc)**
- Liên kết tài khoản với người thân (patient)
- Xem thông tin sức khỏe của người thân
- Nhận cảnh báo khi người thân có vấn đề sức khỏe
- Quản lý thuốc và lịch hẹn cho người thân
- Ghi chú chăm sóc

**2.2.7 Báo cáo sức khỏe**
- Xem báo cáo tổng hợp theo ngày/tuần/tháng
- Xuất báo cáo dạng PDF (TBD - cần xác nhận)
- Phân tích xu hướng sức khỏe

**2.2.8 Thông báo và nhắc nhở**
- Thông báo nhắc nhở uống thuốc
- Thông báo nhắc nhở bữa ăn/vận động
- Thông báo nhắc nhở lịch hẹn
- Cảnh báo sức khỏe

### 2.3 User Classes and Characteristics

Hệ thống SmartCare phục vụ hai nhóm người dùng chính:

**2.3.1 Patient (Người bệnh/Người dùng chính)**
- **Đặc điểm:** Người cần theo dõi và quản lý sức khỏe cá nhân
- **Kỹ năng:** Sử dụng cơ bản điện thoại thông minh
- **Mục đích sử dụng:** 
  - Nhận nhắc nhở uống thuốc
  - Ghi nhận các hoạt động sức khỏe
  - Xem thống kê sức khỏe
  - Nhận tư vấn từ AI
- **Quyền hạn:** 
  - Quản lý thông tin cá nhân
  - Quản lý thuốc và lịch uống thuốc của chính mình
  - Ghi nhận nhật ký sức khỏe
  - Chia sẻ thông tin với caregiver (nếu có)

**2.3.2 Caregiver (Người chăm sóc)**
- **Đặc điểm:** Người thân hoặc người chăm sóc cho patient
- **Kỹ năng:** Sử dụng cơ bản điện thoại thông minh
- **Mục đích sử dụng:**
  - Theo dõi tình trạng sức khỏe của patient
  - Nhận cảnh báo khi patient có vấn đề
  - Quản lý thuốc và lịch hẹn cho patient
  - Ghi chú chăm sóc
- **Quyền hạn:**
  - Xem thông tin sức khỏe của patient (sau khi được patient chấp nhận liên kết)
  - Tạo/sửa lịch hẹn cho patient
  - Xem báo cáo sức khỏe của patient
  - Gửi thông báo nhắc nhở cho patient
  - KHÔNG thể sửa thông tin cá nhân của patient
  - KHÔNG thể xóa dữ liệu của patient

**2.3.3 Đặc điểm chung:**
- Người dùng có thể sử dụng ứng dụng mà không cần kết nối internet liên tục (TBD - cần xác nhận chức năng offline)
- Người dùng cần có điện thoại thông minh chạy hệ điều hành Android hoặc iOS (TBD - cần xác định phiên bản tối thiểu)

### 2.4 Operating Environment

**2.4.1 Môi trường người dùng:**
- Hệ điều hành: Android và/hoặc iOS (TBD - cần xác định cụ thể)
- Phiên bản hệ điều hành tối thiểu: [TBD]
- Kết nối mạng: Wi-Fi hoặc dữ liệu di động
- Quyền truy cập: Camera (nếu có chức năng chụp ảnh), Thông báo, Vị trí (nếu có chức năng theo dõi vị trí)

**2.4.2 Môi trường phát triển:**
[TBD - Không cần mô tả trong SRS nghiệp vụ]

**2.4.3 Môi trường triển khai:**
[TBD - Không cần mô tả trong SRS nghiệp vụ]

### 2.5 Design and Implementation Constraints

**2.5.1 Ràng buộc về nghiệp vụ:**
- Một patient chỉ có thể liên kết với một caregiver tại một thời điểm
- Patient phải chấp nhận yêu cầu liên kết từ caregiver trước khi caregiver có thể xem thông tin
- Thông tin sức khỏe chỉ được lưu trữ trong phạm vi ứng dụng, không chia sẻ với bên thứ ba (trừ dịch vụ AI nếu có)

**2.5.2 Ràng buộc về quy định:**
- Tuân thủ quy định về bảo mật thông tin cá nhân (TBD - cần xác định quy định cụ thể)
- Không cung cấp chẩn đoán y tế, chỉ cung cấp thông tin tham khảo

**2.5.3 Ràng buộc về hiệu năng:**
- Ứng dụng phải hoạt động mượt mà trên thiết bị có cấu hình trung bình trở lên
- Thời gian phản hồi của các thao tác cơ bản không quá [TBD] giây

### 2.6 User Documentation

Hệ thống cần cung cấp các tài liệu hướng dẫn sau cho người dùng:

- Hướng dẫn cài đặt ứng dụng (TBD - nếu cần)
- Hướng dẫn đăng ký và đăng nhập
- Hướng dẫn sử dụng các chức năng chính
- Hướng dẫn liên kết tài khoản caregiver
- FAQ (Câu hỏi thường gặp)
- Chính sách bảo mật và quyền riêng tư

[TBD - Cần xác định định dạng tài liệu: trong ứng dụng, website, PDF, v.v.]

### 2.7 Assumptions and Dependencies

**2.7.1 Giả định:**
- Người dùng có điện thoại thông minh và biết sử dụng cơ bản
- Người dùng có kết nối internet ít nhất định kỳ để đồng bộ dữ liệu
- Người dùng cung cấp thông tin chính xác về thuốc và lịch uống thuốc
- Dịch vụ AI luôn sẵn sàng (TBD - cần xác nhận)

**2.7.2 Phụ thuộc:**
- Dịch vụ AI bên thứ ba để tư vấn sức khỏe
- Dịch vụ lưu trữ đám mây cho ảnh
- Dịch vụ thông báo đẩy (Push Notification)
- Kết nối internet để đồng bộ dữ liệu

---

## 3. System Features

Phần này mô tả chi tiết các chức năng chính của hệ thống SmartCare. Mỗi chức năng được trình bày với mô tả nghiệp vụ, độ ưu tiên, luồng xử lý và danh sách các yêu cầu chức năng.

### 3.1 Quản lý Tài khoản và Xác thực

**Mô tả:** Hệ thống cho phép người dùng đăng ký tài khoản mới, đăng nhập, xác thực tài khoản bằng mã OTP, và quản lý mật khẩu.

**Độ ưu tiên:** High

**Luồng Stimulus/Response:**

**Đăng ký tài khoản:**
- Người dùng nhập thông tin: tên, số điện thoại, mật khẩu, vai trò (Patient hoặc Caregiver)
- Hệ thống kiểm tra số điện thoại chưa được đăng ký
- Hệ thống tạo tài khoản (chưa kích hoạt) và gửi mã OTP
- Người dùng nhập mã OTP để kích hoạt tài khoản
- Hệ thống kích hoạt tài khoản và tự động đăng nhập

**Đăng nhập:**
- Người dùng nhập số điện thoại và mật khẩu
- Hệ thống kiểm tra thông tin đăng nhập
- Nếu đúng và tài khoản đã kích hoạt, hệ thống cho phép đăng nhập
- Nếu tài khoản chưa kích hoạt, hệ thống yêu cầu nhập OTP

**Quên mật khẩu:**
- Người dùng nhập số điện thoại
- Hệ thống gửi mã OTP
- Người dùng nhập OTP và mật khẩu mới
- Hệ thống cập nhật mật khẩu và tự động đăng nhập

**Functional Requirements:**

**REQ-001:** Hệ thống phải cho phép người dùng đăng ký tài khoản mới với thông tin: tên, số điện thoại (định dạng Việt Nam), mật khẩu (tối thiểu 6 ký tự), và vai trò (Patient hoặc Caregiver).

**REQ-002:** Hệ thống phải kiểm tra số điện thoại chưa được đăng ký trước khi tạo tài khoản mới.

**REQ-003:** Hệ thống phải tạo và gửi mã OTP 4 chữ số sau khi đăng ký thành công.

**REQ-004:** Mã OTP phải có thời hạn hiệu lực là 5 phút.

**REQ-005:** Hệ thống phải cho phép người dùng yêu cầu gửi lại mã OTP.

**REQ-006:** Hệ thống phải yêu cầu người dùng nhập mã OTP để kích hoạt tài khoản sau khi đăng ký.

**REQ-007:** Hệ thống phải tự động đăng nhập người dùng sau khi xác thực OTP thành công.

**REQ-008:** Hệ thống phải cho phép người dùng đăng nhập bằng số điện thoại và mật khẩu.

**REQ-009:** Hệ thống phải từ chối đăng nhập nếu tài khoản chưa được kích hoạt.

**REQ-010:** Hệ thống phải cho phép người dùng đăng xuất khỏi ứng dụng.

**REQ-011:** Hệ thống phải cho phép người dùng yêu cầu đặt lại mật khẩu bằng cách nhập số điện thoại.

**REQ-012:** Hệ thống phải gửi mã OTP để xác thực trước khi cho phép đặt lại mật khẩu.

**REQ-013:** Hệ thống phải cho phép người dùng đổi mật khẩu khi đã đăng nhập (yêu cầu nhập mật khẩu hiện tại).

**REQ-014:** Hệ thống phải lưu trữ mật khẩu dưới dạng mã hóa, không lưu dạng văn bản thuần.

### 3.2 Quản lý Thuốc và Nhắc nhở Uống thuốc

**Mô tả:** Hệ thống cho phép người dùng thêm, sửa, xóa thông tin thuốc, thiết lập lịch uống thuốc, và nhận thông báo nhắc nhở.

**Độ ưu tiên:** High

**Luồng Stimulus/Response:**

**Thêm thuốc mới:**
- Người dùng nhập thông tin thuốc: tên, liều lượng, đơn vị, ghi chú, tần suất (hàng ngày hoặc cách ngày), các giờ uống, ngày bắt đầu
- Hệ thống tạo thuốc mới và tự động tạo các reminder cho ngày hôm nay (nếu phù hợp với tần suất)
- Hệ thống lên lịch thông báo nhắc nhở cho các reminder

**Xem lịch uống thuốc hôm nay:**
- Người dùng mở màn hình Dashboard
- Hệ thống hiển thị danh sách các reminder trong ngày, sắp xếp theo giờ
- Hệ thống đánh dấu các reminder đã quá giờ hơn 1 giờ và vẫn chưa uống

**Đánh dấu đã uống/bỏ qua:**
- Người dùng chọn reminder và chọn trạng thái: Đã uống hoặc Bỏ qua
- Hệ thống cập nhật trạng thái reminder
- Nếu đã uống, hệ thống lưu thời gian uống
- Hệ thống hủy các thông báo nhắc nhở còn lại của reminder đó

**Thông báo nhắc nhở:**
- Hệ thống gửi thông báo tại các thời điểm: 15 phút trước, 10 phút trước, 5 phút trước, và đúng giờ uống thuốc
- Thông báo đúng giờ có nội dung cảnh báo "Trễ hẹn"

**Functional Requirements:**

**REQ-015:** Hệ thống phải cho phép người dùng thêm thuốc mới với thông tin: tên thuốc, liều lượng, đơn vị (mặc định: mg), ghi chú, tần suất (hàng ngày hoặc cách ngày), danh sách giờ uống (định dạng HH:mm), và ngày bắt đầu.

**REQ-016:** Hệ thống phải tự động tạo các reminder cho ngày hôm nay khi thêm thuốc mới, dựa trên tần suất và các giờ uống.

**REQ-017:** Đối với thuốc uống cách ngày, hệ thống chỉ tạo reminder nếu số ngày từ ngày bắt đầu đến hôm nay là số chẵn.

**REQ-018:** Hệ thống phải hiển thị danh sách reminder trong ngày, sắp xếp theo giờ tăng dần.

**REQ-019:** Hệ thống phải đánh dấu các reminder đã quá giờ hơn 1 giờ và vẫn ở trạng thái "Chờ" là "Đã quên".

**REQ-020:** Hệ thống phải cho phép người dùng cập nhật trạng thái reminder: Đã uống, Bỏ qua, hoặc Chờ.

**REQ-021:** Khi đánh dấu "Đã uống", hệ thống phải lưu thời gian uống thuốc.

**REQ-022:** Hệ thống phải cho phép người dùng sửa thông tin reminder: giờ uống, liều lượng, đơn vị.

**REQ-023:** Hệ thống phải cho phép người dùng xóa thuốc (sẽ xóa tất cả reminder liên quan).

**REQ-024:** Hệ thống phải cho phép người dùng xóa một reminder cụ thể.

**REQ-025:** Hệ thống phải gửi thông báo nhắc nhở tại 4 thời điểm: 15 phút trước, 10 phút trước, 5 phút trước, và đúng giờ uống thuốc.

**REQ-026:** Thông báo đúng giờ phải có tiêu đề cảnh báo "Trễ hẹn" và nội dung nhắc nhở.

**REQ-027:** Hệ thống phải hủy các thông báo nhắc nhở còn lại khi người dùng đánh dấu đã uống hoặc bỏ qua.

**REQ-028:** Hệ thống phải hiển thị danh sách thuốc đã quên (quá 1 giờ, trạng thái vẫn là "Chờ"), tối đa 50 mục, sắp xếp theo giờ giảm dần.

### 3.3 Theo dõi Nhật ký Sức khỏe

**Mô tả:** Hệ thống cho phép người dùng ghi nhận các hoạt động sức khỏe bao gồm bữa ăn, vận động, và triệu chứng. Hệ thống cũng hỗ trợ lên lịch nhắc nhở cho bữa ăn và vận động.

**Độ ưu tiên:** High

**Luồng Stimulus/Response:**

**Ghi nhận bữa ăn:**
- Người dùng nhập tên món ăn và lượng calo (hoặc sử dụng AI để ước tính)
- Người dùng có thể lên lịch nhắc nhở cho bữa ăn (ngày và giờ)
- Hệ thống lưu thông tin bữa ăn và lên lịch thông báo nếu có

**Ghi nhận vận động:**
- Người dùng nhập loại vận động, thời gian (phút), và lượng calo tiêu thụ (hoặc sử dụng AI để ước tính)
- Người dùng có thể lên lịch nhắc nhở cho vận động
- Hệ thống lưu thông tin vận động và lên lịch thông báo nếu có

**Ghi nhận triệu chứng:**
- Người dùng nhập tên triệu chứng, mức độ nghiêm trọng (1-10), và ghi chú
- Hệ thống lưu thông tin triệu chứng
- Nếu mức độ >= 7, hệ thống tạo cảnh báo cho caregiver (nếu có)

**Xem nhật ký hôm nay:**
- Người dùng mở màn hình Dashboard
- Hệ thống hiển thị danh sách bữa ăn và vận động trong ngày (không bao gồm triệu chứng)
- Hệ thống đánh dấu các hoạt động đã hoàn thành và chưa hoàn thành

**Functional Requirements:**

**REQ-029:** Hệ thống phải cho phép người dùng ghi nhận bữa ăn với thông tin: tên món ăn, lượng calo, ngày, và có thể lên lịch nhắc nhở (ngày và giờ).

**REQ-030:** Hệ thống phải cho phép người dùng ghi nhận vận động với thông tin: loại vận động, thời gian (phút), lượng calo tiêu thụ, ngày, và có thể lên lịch nhắc nhở.

**REQ-031:** Hệ thống phải cho phép người dùng ghi nhận triệu chứng với thông tin: tên triệu chứng, mức độ nghiêm trọng (1-10), ghi chú, và ngày.

**REQ-032:** Hệ thống phải hiển thị danh sách bữa ăn và vận động trong ngày trên Dashboard, sắp xếp theo giờ.

**REQ-033:** Hệ thống phải đánh dấu các hoạt động đã hoàn thành và chưa hoàn thành.

**REQ-034:** Hệ thống phải gửi thông báo nhắc nhở cho bữa ăn/vận động đã lên lịch tại các thời điểm: 15 phút trước, 10 phút trước, 5 phút trước, và đúng giờ.

**REQ-035:** Hệ thống phải cho phép người dùng cập nhật thông tin bữa ăn/vận động/triệu chứng đã ghi nhận.

**REQ-036:** Hệ thống phải cho phép người dùng xóa bữa ăn/vận động/triệu chứng đã ghi nhận.

**REQ-037:** Hệ thống phải tính tổng lượng calo nạp vào và calo tiêu thụ trong ngày/tuần/tháng.

**REQ-038:** Khi người dùng ghi nhận triệu chứng có mức độ >= 7, hệ thống phải tạo cảnh báo cho caregiver (nếu patient đã liên kết với caregiver).

**REQ-039:** Hệ thống phải hiển thị thống kê sức khỏe theo ngày/tuần/tháng bao gồm: tổng calo nạp vào, tổng calo tiêu thụ, danh sách bữa ăn, danh sách vận động, và danh sách triệu chứng.

### 3.4 Quản lý Lịch hẹn Khám bác sĩ

**Mô tả:** Hệ thống cho phép người dùng tạo, xem, sửa, xóa lịch hẹn khám bác sĩ và nhận thông báo nhắc nhở trước lịch hẹn.

**Độ ưu tiên:** Medium

**Luồng Stimulus/Response:**

**Tạo lịch hẹn:**
- Người dùng nhập thông tin: tên bác sĩ, chuyên khoa, tên bệnh viện, ngày hẹn, giờ hẹn, ghi chú, thời gian nhắc nhở trước (mặc định 24 giờ)
- Hệ thống lưu lịch hẹn và lên lịch thông báo nhắc nhở

**Xem lịch hẹn:**
- Người dùng xem danh sách lịch hẹn sắp tới (chưa hoàn thành, chưa đến ngày)
- Hệ thống sắp xếp theo ngày tăng dần

**Đánh dấu hoàn thành:**
- Người dùng đánh dấu lịch hẹn đã hoàn thành
- Hệ thống cập nhật trạng thái và không hiển thị trong danh sách sắp tới

**Functional Requirements:**

**REQ-040:** Hệ thống phải cho phép người dùng tạo lịch hẹn với thông tin: tên bác sĩ, chuyên khoa, tên bệnh viện, ngày hẹn, giờ hẹn, ghi chú, và thời gian nhắc nhở trước (mặc định 24 giờ).

**REQ-041:** Hệ thống phải hiển thị danh sách lịch hẹn sắp tới (chưa hoàn thành, chưa đến ngày), sắp xếp theo ngày tăng dần.

**REQ-042:** Hệ thống phải gửi thông báo nhắc nhở trước lịch hẹn theo thời gian đã thiết lập.

**REQ-043:** Hệ thống phải cho phép người dùng cập nhật thông tin lịch hẹn.

**REQ-044:** Hệ thống phải cho phép người dùng xóa lịch hẹn.

**REQ-045:** Hệ thống phải cho phép người dùng đánh dấu lịch hẹn đã hoàn thành.

**REQ-046:** Caregiver có thể tạo lịch hẹn cho patient (sau khi được patient chấp nhận liên kết).

### 3.5 Trợ lý AI Tư vấn Sức khỏe

**Mô tả:** Hệ thống cung cấp trợ lý AI để tư vấn sức khỏe, phân tích đơn thuốc, ước tính calo, và nhận diện tình trạng bệnh lý.

**Độ ưu tiên:** Medium

**Luồng Stimulus/Response:**

**Chat với AI:**
- Người dùng nhập câu hỏi về sức khỏe
- Hệ thống gửi câu hỏi đến dịch vụ AI kèm theo thông tin tình trạng bệnh lý của người dùng
- AI trả lời dựa trên tình trạng bệnh lý và lịch sử chat gần đây
- Hệ thống hiển thị câu trả lời và lưu vào lịch sử chat

**Ước tính calo:**
- Người dùng nhập tên món ăn hoặc loại vận động
- Hệ thống gửi yêu cầu đến AI để ước tính calo và chuẩn hóa tên (tiếng Việt có dấu)
- AI trả về lượng calo và tên đã chuẩn hóa
- Hệ thống hiển thị kết quả

**Phân tích đơn thuốc:**
- Người dùng cung cấp ảnh đơn thuốc hoặc văn bản hướng dẫn
- Hệ thống gửi đến AI để phân tích
- AI trích xuất thông tin: tên thuốc, liều lượng, đơn vị, tần suất, giờ uống, ghi chú
- Hệ thống hiển thị thông tin đã trích xuất, người dùng có thể chỉnh sửa trước khi lưu

**Nhận diện tình trạng bệnh lý:**
- Người dùng nhập mô tả tình trạng bệnh
- Hệ thống gửi đến AI để nhận diện và chuẩn hóa
- AI trả về tên bệnh/tình trạng bằng tiếng Việt có dấu
- Hệ thống cập nhật tình trạng bệnh lý của người dùng

**Functional Requirements:**

**REQ-047:** Hệ thống phải cho phép người dùng chat với trợ lý AI về các vấn đề sức khỏe.

**REQ-048:** Trợ lý AI phải tư vấn dựa trên tình trạng bệnh lý của người dùng (nếu có).

**REQ-049:** Trợ lý AI phải sử dụng lịch sử chat gần đây (5 cuộc hội thoại) để có ngữ cảnh.

**REQ-050:** Câu trả lời của AI phải bằng tiếng Việt, ngắn gọn (dưới 100 từ), và luôn kèm theo lời khuyên y tế (disclaimer).

**REQ-051:** Hệ thống phải lưu lịch sử chat để người dùng xem lại.

**REQ-052:** Hệ thống phải cho phép người dùng ước tính lượng calo cho món ăn hoặc vận động bằng cách nhập tên.

**REQ-053:** Hệ thống phải chuẩn hóa tên món ăn/vận động thành tiếng Việt có dấu đầy đủ.

**REQ-054:** Hệ thống phải cho phép người dùng phân tích đơn thuốc từ ảnh hoặc văn bản để trích xuất thông tin thuốc.

**REQ-055:** Hệ thống phải cho phép người dùng nhận diện và chuẩn hóa tình trạng bệnh lý từ mô tả.

**REQ-056:** Hệ thống phải cập nhật tình trạng bệnh lý của người dùng sau khi nhận diện thành công.

**REQ-057:** Hệ thống phải cung cấp gợi ý sức khỏe dựa trên tình trạng bệnh lý của người dùng.

### 3.6 Chức năng Caregiver (Người chăm sóc)

**Mô tả:** Hệ thống cho phép caregiver liên kết với patient, theo dõi tình trạng sức khỏe của patient, nhận cảnh báo, và quản lý chăm sóc.

**Độ ưu tiên:** High

**Luồng Stimulus/Response:**

**Liên kết tài khoản:**
- Patient tạo mã liên kết 6 chữ số (mã cố định, không đổi)
- Caregiver nhập mã liên kết
- Hệ thống tạo yêu cầu liên kết (status: pending)
- Patient xem danh sách yêu cầu và chấp nhận/từ chối
- Nếu chấp nhận, hệ thống liên kết caregiver với patient và từ chối các yêu cầu khác

**Xem danh sách patients:**
- Caregiver mở màn hình danh sách patients
- Hệ thống hiển thị danh sách patients đã liên kết kèm thống kê: tỷ lệ tuân thủ uống thuốc (7 ngày qua), số cảnh báo chưa đọc, trạng thái cần chú ý
- Caregiver có thể lọc: tất cả, cần chú ý, cập nhật gần đây

**Xem chi tiết patient:**
- Caregiver chọn một patient
- Hệ thống hiển thị thông tin chi tiết: thông tin cá nhân, timeline thuốc trong ngày, lịch sử uống thuốc 7 ngày, tóm tắt sức khỏe hôm nay, danh sách lịch hẹn

**Nhận cảnh báo:**
- Khi patient ghi nhận triệu chứng có mức độ >= 7, hệ thống tạo cảnh báo cho caregiver
- Caregiver xem danh sách cảnh báo, có thể đánh dấu đã đọc

**Functional Requirements:**

**REQ-058:** Patient phải có thể tạo mã liên kết 6 chữ số (mã này cố định, không thay đổi).

**REQ-059:** Caregiver phải có thể nhập mã liên kết để gửi yêu cầu liên kết với patient.

**REQ-060:** Hệ thống phải tạo yêu cầu liên kết với trạng thái "pending" khi caregiver nhập mã.

**REQ-061:** Patient phải có thể xem danh sách yêu cầu liên kết từ caregivers.

**REQ-062:** Patient phải có thể chấp nhận hoặc từ chối yêu cầu liên kết.

**REQ-063:** Một patient chỉ có thể liên kết với một caregiver tại một thời điểm.

**REQ-064:** Khi patient chấp nhận yêu cầu, hệ thống phải tự động từ chối các yêu cầu pending khác.

**REQ-065:** Caregiver phải có thể xem danh sách patients đã liên kết với thống kê: tỷ lệ tuân thủ uống thuốc (7 ngày qua), số cảnh báo chưa đọc, trạng thái cần chú ý (tỷ lệ tuân thủ < 70% hoặc có cảnh báo chưa đọc).

**REQ-066:** Caregiver phải có thể lọc danh sách patients: tất cả, cần chú ý, cập nhật gần đây (24h).

**REQ-067:** Caregiver phải có thể xem chi tiết patient: thông tin cá nhân, timeline thuốc trong ngày (nhóm theo buổi: sáng, trưa, chiều, tối), lịch sử uống thuốc 7 ngày, tóm tắt sức khỏe hôm nay (calo, vận động, triệu chứng), danh sách lịch hẹn.

**REQ-068:** Hệ thống phải tự động tạo cảnh báo cho caregiver khi patient ghi nhận triệu chứng có mức độ >= 7.

**REQ-069:** Caregiver phải có thể xem danh sách cảnh báo, có thể lọc theo patient hoặc xem tất cả.

**REQ-070:** Caregiver phải có thể đánh dấu cảnh báo đã đọc.

**REQ-071:** Caregiver phải có thể tạo lịch hẹn cho patient.

**REQ-072:** Caregiver phải có thể xem báo cáo sức khỏe của patient.

**REQ-073:** Caregiver phải có thể tạo ghi chú chăm sóc cho patient.

**REQ-074:** Caregiver phải có thể xem danh sách liên hệ khẩn cấp của patient.

**REQ-075:** Caregiver KHÔNG thể sửa thông tin cá nhân của patient.

**REQ-076:** Caregiver KHÔNG thể xóa dữ liệu của patient.

### 3.7 Báo cáo Sức khỏe

**Mô tả:** Hệ thống cho phép người dùng xem báo cáo tổng hợp sức khỏe theo các khoảng thời gian khác nhau và xuất báo cáo dạng PDF.

**Độ ưu tiên:** Medium

**Luồng Stimulus/Response:**

**Xem báo cáo:**
- Người dùng chọn khoảng thời gian: hôm nay, tuần này, tháng này, 7 ngày qua, 30 ngày qua
- Hệ thống tính toán và hiển thị: tỷ lệ tuân thủ uống thuốc, tổng calo nạp vào/tiêu thụ, danh sách bữa ăn, danh sách vận động, danh sách triệu chứng, thống kê thư giãn
- Hệ thống có thể gọi AI để phân tích báo cáo và đưa ra lưu ý

**Xuất PDF:**
- Người dùng chọn xuất báo cáo PDF
- Hệ thống tạo file PDF với thông tin báo cáo
- Người dùng có thể tải xuống hoặc chia sẻ file PDF

**Functional Requirements:**

**REQ-077:** Hệ thống phải cho phép người dùng xem báo cáo sức khỏe theo các khoảng thời gian: hôm nay, tuần này, tháng này, 7 ngày qua, 30 ngày qua.

**REQ-078:** Báo cáo phải bao gồm: tỷ lệ tuân thủ uống thuốc (tổng số, đã uống, đã bỏ qua, tỷ lệ %), tổng calo nạp vào, tổng calo tiêu thụ, danh sách bữa ăn, danh sách vận động, danh sách triệu chứng (nhóm theo ngày), thống kê thư giãn (tổng thời gian, số lần).

**REQ-079:** Hệ thống phải cho phép người dùng xuất báo cáo dạng PDF.

**REQ-080:** File PDF phải bao gồm: thông tin người dùng, kỳ báo cáo, tỷ lệ tuân thủ uống thuốc, thống kê sức khỏe, danh sách bữa ăn, thống kê thư giãn.

**REQ-081:** Hệ thống phải cho phép người dùng sử dụng AI để phân tích báo cáo và đưa ra lưu ý về ăn uống, vận động, và triệu chứng.

**REQ-082:** Kết quả phân tích AI phải được lưu cache trong 12 giờ để tránh gọi lại nhiều lần.

### 3.8 Thông báo và Nhắc nhở

**Mô tả:** Hệ thống gửi thông báo nhắc nhở cho người dùng về các hoạt động sức khỏe và cảnh báo.

**Độ ưu tiên:** High

**Luồng Stimulus/Response:**

**Thông báo nhắc nhở thuốc:**
- Hệ thống tự động gửi thông báo tại 4 thời điểm: 15 phút trước, 10 phút trước, 5 phút trước, và đúng giờ uống thuốc
- Thông báo hiển thị tên thuốc, liều lượng, và giờ uống
- Khi người dùng đánh dấu đã uống, hệ thống hủy các thông báo còn lại

**Thông báo nhắc nhở bữa ăn/vận động:**
- Hệ thống gửi thông báo cho các hoạt động đã lên lịch tại 4 thời điểm tương tự
- Thông báo hiển thị loại hoạt động và giờ thực hiện

**Thông báo nhắc nhở lịch hẹn:**
- Hệ thống gửi thông báo trước lịch hẹn theo thời gian đã thiết lập
- Thông báo hiển thị thông tin bác sĩ, bệnh viện, ngày giờ hẹn

**Cảnh báo sức khỏe:**
- Hệ thống gửi cảnh báo cho caregiver khi patient có triệu chứng nghiêm trọng

**Functional Requirements:**

**REQ-083:** Hệ thống phải gửi thông báo nhắc nhở uống thuốc tại 4 thời điểm: 15 phút trước, 10 phút trước, 5 phút trước, và đúng giờ uống thuốc.

**REQ-084:** Thông báo phải hiển thị tên thuốc, liều lượng, đơn vị, và giờ uống.

**REQ-085:** Thông báo đúng giờ phải có tiêu đề cảnh báo "Trễ hẹn".

**REQ-086:** Hệ thống phải gửi thông báo nhắc nhở bữa ăn/vận động đã lên lịch tại 4 thời điểm tương tự.

**REQ-087:** Hệ thống phải gửi thông báo nhắc nhở lịch hẹn trước thời gian đã thiết lập.

**REQ-088:** Hệ thống phải hủy các thông báo nhắc nhở còn lại khi người dùng đánh dấu đã hoàn thành hoặc bỏ qua.

**REQ-089:** Hệ thống phải gửi cảnh báo cho caregiver khi patient có triệu chứng nghiêm trọng (mức độ >= 7).

**REQ-090:** Người dùng phải có thể cấu hình cài đặt thông báo: bật/tắt thông báo cho từng loại (thuốc, bữa ăn, vận động), thời gian nhắc nhở trước.

### 3.9 Thư giãn và Wellness

**Mô tả:** Hệ thống cung cấp các tính năng thư giãn bao gồm nhạc thư giãn và bài tập thở.

**Độ ưu tiên:** Low

**Luồng Stimulus/Response:**

**Nghe nhạc thư giãn:**
- Người dùng chọn loại nhạc (Chill, Rain, Forest, Sea)
- Hệ thống phát nhạc
- Hệ thống ghi nhận thời gian nghe và lưu vào nhật ký wellness

**Bài tập thở:**
- Người dùng thực hiện bài tập thở
- Hệ thống ghi nhận thời gian và lưu vào nhật ký wellness

**Functional Requirements:**

**REQ-091:** Hệ thống phải cung cấp các bản nhạc thư giãn: Chill, Rain, Forest, Sea.

**REQ-092:** Hệ thống phải cho phép người dùng phát/dừng nhạc thư giãn.

**REQ-093:** Hệ thống phải ghi nhận thời gian nghe nhạc và lưu vào nhật ký wellness.

**REQ-094:** Hệ thống phải cung cấp bài tập thở cho người dùng.

**REQ-095:** Hệ thống phải ghi nhận thời gian thực hiện bài tập thở và lưu vào nhật ký wellness.

**REQ-096:** Hệ thống phải hiển thị thống kê thư giãn: tổng thời gian (phút), số lần thực hiện.

---

## 4. External Interface Requirements

### 4.1 User Interfaces

**4.1.1 Màn hình đăng ký/đăng nhập:**
- Màn hình đăng ký: Form nhập thông tin (tên, số điện thoại, mật khẩu, vai trò)
- Màn hình nhập OTP: Form nhập mã OTP 4 chữ số
- Màn hình đăng nhập: Form nhập số điện thoại và mật khẩu
- Màn hình quên mật khẩu: Form nhập số điện thoại, sau đó nhập OTP và mật khẩu mới

**4.1.2 Màn hình Dashboard:**
- Hiển thị danh sách reminder uống thuốc trong ngày, sắp xếp theo giờ
- Hiển thị danh sách bữa ăn và vận động trong ngày
- Hiển thị lịch hẹn sắp tới
- Có thể lọc theo loại: tất cả, thuốc, bữa ăn, vận động, lịch hẹn
- Đánh dấu các hoạt động đã quên (quá 1 giờ, chưa hoàn thành)

**4.1.3 Màn hình quản lý thuốc:**
- Danh sách thuốc đã thêm
- Form thêm/sửa thuốc: tên, liều lượng, đơn vị, ghi chú, tần suất, giờ uống, ngày bắt đầu
- Có thể xóa thuốc

**4.1.4 Màn hình theo dõi sức khỏe:**
- Form ghi nhận bữa ăn: tên món, calo, ngày, có thể lên lịch nhắc nhở
- Form ghi nhận vận động: loại, thời gian, calo, ngày, có thể lên lịch nhắc nhở
- Form ghi nhận triệu chứng: tên, mức độ (1-10), ghi chú, ngày
- Có thể sửa/xóa các mục đã ghi nhận

**4.1.5 Màn hình lịch hẹn:**
- Danh sách lịch hẹn sắp tới
- Form tạo/sửa lịch hẹn: bác sĩ, chuyên khoa, bệnh viện, ngày, giờ, ghi chú, thời gian nhắc nhở
- Có thể xóa và đánh dấu hoàn thành

**4.1.6 Màn hình Chat AI:**
- Giao diện chat với danh sách tin nhắn
- Ô nhập tin nhắn
- Hiển thị câu trả lời của AI
- Có thể xem lịch sử chat

**4.1.7 Màn hình Caregiver Dashboard:**
- Danh sách patients đã liên kết với thống kê
- Có thể lọc: tất cả, cần chú ý, cập nhật gần đây
- Xem chi tiết từng patient

**4.1.8 Màn hình báo cáo:**
- Chọn khoảng thời gian: hôm nay, tuần này, tháng này, 7 ngày, 30 ngày
- Hiển thị các thống kê và biểu đồ
- Nút xuất PDF

**4.1.9 Màn hình cài đặt:**
- Cài đặt thông báo: bật/tắt từng loại, thời gian nhắc nhở
- Đổi mật khẩu
- Quản lý thông tin cá nhân
- Liên kết caregiver (tạo mã, xem yêu cầu)

**4.1.10 Nguyên tắc thiết kế:**
- Giao diện đơn giản, dễ sử dụng
- Phù hợp với người dùng lớn tuổi
- Màu sắc rõ ràng, dễ phân biệt
- Font chữ đủ lớn để dễ đọc

### 4.2 Hardware Interfaces

Hệ thống không yêu cầu kết nối trực tiếp với thiết bị phần cứng đặc biệt. Các yêu cầu về phần cứng chỉ là các tính năng tiêu chuẩn của điện thoại thông minh:
- Màn hình cảm ứng
- Camera (nếu có chức năng chụp ảnh đơn thuốc)
- Loa/headphone (để nghe nhạc thư giãn)
- Cảm biến (nếu có chức năng phát hiện té ngã - nhưng chức năng này chưa có trong hệ thống)

### 4.3 Software Interfaces

**4.3.1 Dịch vụ AI:**
- Hệ thống tích hợp với dịch vụ AI bên thứ ba để cung cấp tư vấn sức khỏe, phân tích đơn thuốc, ước tính calo, và nhận diện bệnh lý
- Giao tiếp thông qua API

**4.3.2 Dịch vụ lưu trữ đám mây:**
- Hệ thống sử dụng dịch vụ lưu trữ đám mây để lưu trữ ảnh (avatar, ảnh đơn thuốc)
- Giao tiếp thông qua API

**4.3.3 Dịch vụ thông báo:**
- Hệ thống sử dụng dịch vụ thông báo đẩy để gửi thông báo đến thiết bị người dùng
- Hỗ trợ thông báo local trên thiết bị

### 4.4 Communications Interfaces

**4.4.1 Kết nối mạng:**
- Hệ thống yêu cầu kết nối internet (Wi-Fi hoặc dữ liệu di động) để đồng bộ dữ liệu và sử dụng các dịch vụ AI
- Hệ thống có thể hoạt động offline một phần (ghi nhận dữ liệu local), sau đó đồng bộ khi có kết nối

**4.4.2 Giao thức:**
- Giao tiếp với server thông qua HTTPS
- Sử dụng JSON cho định dạng dữ liệu

---

## 5. Other Nonfunctional Requirements

### 5.1 Performance Requirements

**5.1.1 Thời gian phản hồi:**
- Thời gian mở ứng dụng: không quá 3 giây
- Thời gian phản hồi các thao tác cơ bản (thêm, sửa, xóa): không quá 2 giây
- Thời gian tải danh sách dữ liệu: không quá 3 giây
- Thời gian phản hồi từ AI: không quá 10 giây

**5.1.2 Hiệu năng:**
- Ứng dụng phải hoạt động mượt mà trên thiết bị có cấu hình trung bình trở lên
- Không bị lag khi cuộn danh sách dài
- Không tiêu tốn quá nhiều pin

**5.1.3 Dung lượng:**
- Kích thước ứng dụng: tối đa [TBD] MB
- Dung lượng lưu trữ dữ liệu local: tối đa [TBD] MB

### 5.2 Safety Requirements

**5.2.1 An toàn dữ liệu:**
- Thông tin sức khỏe của người dùng phải được bảo mật, không bị rò rỉ
- Mật khẩu phải được mã hóa trước khi lưu trữ
- Dữ liệu truyền tải phải được mã hóa (HTTPS)

**5.2.2 An toàn người dùng:**
- Hệ thống không cung cấp chẩn đoán y tế, chỉ cung cấp thông tin tham khảo
- Khi có triệu chứng nghiêm trọng, hệ thống phải khuyến khích người dùng đi khám bác sĩ
- Thông báo cảnh báo cho caregiver khi patient có vấn đề sức khỏe nghiêm trọng

### 5.3 Security Requirements

**5.3.1 Xác thực:**
- Người dùng phải đăng ký và xác thực bằng OTP trước khi sử dụng
- Mỗi phiên đăng nhập có thời hạn hiệu lực
- Hệ thống phải yêu cầu đăng nhập lại sau một khoảng thời gian không hoạt động

**5.3.2 Phân quyền:**
- Patient chỉ có thể xem và quản lý dữ liệu của chính mình
- Caregiver chỉ có thể xem dữ liệu của patient sau khi được patient chấp nhận liên kết
- Caregiver không thể sửa hoặc xóa dữ liệu của patient

**5.3.3 Bảo mật dữ liệu:**
- Dữ liệu phải được lưu trữ an toàn trên server
- Thông tin cá nhân không được chia sẻ với bên thứ ba (trừ dịch vụ AI và lưu trữ đám mây đã được người dùng đồng ý)
- Tuân thủ các quy định về bảo vệ dữ liệu cá nhân

### 5.4 Software Quality Attributes

**5.4.1 Độ tin cậy:**
- Tỷ lệ uptime của hệ thống: ít nhất 99%
- Hệ thống phải có cơ chế phục hồi khi gặp lỗi
- Dữ liệu phải được sao lưu định kỳ

**5.4.2 Khả năng sử dụng:**
- Giao diện đơn giản, dễ hiểu
- Hướng dẫn sử dụng rõ ràng
- Hỗ trợ tiếng Việt đầy đủ
- Phù hợp với người dùng lớn tuổi

**5.4.3 Khả năng bảo trì:**
- Code phải được tổ chức rõ ràng, dễ bảo trì
- Có tài liệu kỹ thuật cho developers
- Có cơ chế logging để debug

**5.4.4 Khả năng mở rộng:**
- Hệ thống phải có thể mở rộng để thêm tính năng mới
- Kiến trúc phải hỗ trợ tăng số lượng người dùng

**5.4.5 Khả năng tương thích:**
- Hỗ trợ các phiên bản hệ điều hành phổ biến
- Hoạt động trên các kích thước màn hình khác nhau

---

## 6. Other Requirements

**6.1 Yêu cầu về ngôn ngữ:**
- Hệ thống sử dụng tiếng Việt làm ngôn ngữ chính
- Tất cả giao diện, thông báo, hướng dẫn đều bằng tiếng Việt

**6.2 Yêu cầu về hỗ trợ:**
- Cung cấp FAQ trong ứng dụng
- Có thể liên hệ hỗ trợ qua email hoặc hotline (TBD)

**6.3 Yêu cầu về cập nhật:**
- Hệ thống phải hỗ trợ cập nhật phiên bản mới
- Thông báo người dùng khi có phiên bản mới

---

## Appendix A: Glossary

**Adherence Rate (Tỷ lệ tuân thủ):** Tỷ lệ phần trăm số lần uống thuốc đúng giờ so với tổng số lần phải uống trong một khoảng thời gian.

**Caregiver (Người chăm sóc):** Người dùng có vai trò chăm sóc, theo dõi sức khỏe của patient. Một caregiver có thể liên kết với một hoặc nhiều patient.

**Health Log (Nhật ký sức khỏe):** Bản ghi về các hoạt động sức khỏe bao gồm bữa ăn, vận động, hoặc triệu chứng.

**Medication (Thuốc):** Thông tin về loại thuốc mà người dùng cần uống, bao gồm tên, liều lượng, đơn vị, và lịch uống.

**OTP (One-Time Password):** Mã xác thực một lần, có thời hạn hiệu lực, dùng để kích hoạt tài khoản hoặc đặt lại mật khẩu.

**Patient (Người bệnh/Người dùng chính):** Người dùng chính của hệ thống, cần theo dõi và quản lý sức khỏe cá nhân.

**Reminder (Nhắc nhở):** Bản ghi về một lần uống thuốc cụ thể tại một thời điểm, có trạng thái: Chờ, Đã uống, Bỏ qua.

**Wellness (Thư giãn):** Các hoạt động thư giãn bao gồm nghe nhạc và bài tập thở.

---

## Appendix B: Analysis Models

### B.1 Actors (Tác nhân)

Hệ thống SmartCare có 2 actors chính:

1. **Patient (Người bệnh)**
   - Đặc điểm: Người cần quản lý sức khỏe cá nhân
   - Mục đích: Theo dõi sức khỏe, nhận nhắc nhở, nhận tư vấn

2. **Caregiver (Người chăm sóc)**
   - Đặc điểm: Người thân hoặc người chăm sóc cho patient
   - Mục đích: Theo dõi và quản lý sức khỏe của patient

### B.2 Use Cases (Các trường hợp sử dụng)

**B.2.1 Quản lý tài khoản:**
- UC-001: Đăng ký tài khoản
- UC-002: Xác thực tài khoản bằng OTP
- UC-003: Đăng nhập
- UC-004: Đăng xuất
- UC-005: Quên mật khẩu
- UC-006: Đổi mật khẩu
- UC-007: Quản lý thông tin cá nhân

**B.2.2 Quản lý thuốc:**
- UC-008: Thêm thuốc mới
- UC-009: Sửa thông tin thuốc
- UC-010: Xóa thuốc
- UC-011: Xem lịch uống thuốc hôm nay
- UC-012: Đánh dấu đã uống thuốc
- UC-013: Đánh dấu bỏ qua thuốc
- UC-014: Xem danh sách thuốc đã quên

**B.2.3 Theo dõi sức khỏe:**
- UC-015: Ghi nhận bữa ăn
- UC-016: Ghi nhận vận động
- UC-017: Ghi nhận triệu chứng
- UC-018: Xem nhật ký sức khỏe
- UC-019: Sửa thông tin nhật ký
- UC-020: Xóa nhật ký

**B.2.4 Quản lý lịch hẹn:**
- UC-021: Tạo lịch hẹn
- UC-022: Xem danh sách lịch hẹn
- UC-023: Sửa lịch hẹn
- UC-024: Xóa lịch hẹn
- UC-025: Đánh dấu lịch hẹn hoàn thành

**B.2.5 Trợ lý AI:**
- UC-026: Chat với AI
- UC-027: Ước tính calo
- UC-028: Phân tích đơn thuốc
- UC-029: Nhận diện tình trạng bệnh lý
- UC-030: Xem gợi ý sức khỏe

**B.2.6 Chức năng Caregiver:**
- UC-031: Tạo mã liên kết (Patient)
- UC-032: Gửi yêu cầu liên kết (Caregiver)
- UC-033: Chấp nhận/từ chối yêu cầu (Patient)
- UC-034: Xem danh sách patients (Caregiver)
- UC-035: Xem chi tiết patient (Caregiver)
- UC-036: Xem cảnh báo (Caregiver)
- UC-037: Tạo ghi chú chăm sóc (Caregiver)
- UC-038: Tạo lịch hẹn cho patient (Caregiver)

**B.2.7 Báo cáo:**
- UC-039: Xem báo cáo sức khỏe
- UC-040: Xuất báo cáo PDF
- UC-041: Phân tích báo cáo bằng AI

**B.2.8 Thư giãn:**
- UC-042: Nghe nhạc thư giãn
- UC-043: Thực hiện bài tập thở

### B.3 Luồng Nghiệp vụ Chính

**B.3.1 Luồng đăng ký và kích hoạt tài khoản:**
1. Người dùng mở ứng dụng lần đầu
2. Chọn "Đăng ký"
3. Nhập thông tin: tên, số điện thoại, mật khẩu, vai trò
4. Hệ thống kiểm tra số điện thoại chưa được đăng ký
5. Hệ thống tạo tài khoản và gửi mã OTP
6. Người dùng nhập mã OTP
7. Hệ thống xác thực và kích hoạt tài khoản
8. Hệ thống tự động đăng nhập người dùng

**B.3.2 Luồng thêm thuốc và nhận nhắc nhở:**
1. Người dùng chọn "Thêm thuốc"
2. Nhập thông tin thuốc: tên, liều lượng, đơn vị, tần suất, giờ uống, ngày bắt đầu
3. Hệ thống tạo thuốc và tự động tạo reminder cho ngày hôm nay (nếu phù hợp)
4. Hệ thống lên lịch thông báo nhắc nhở tại 4 thời điểm
5. Khi đến giờ nhắc nhở, hệ thống gửi thông báo
6. Người dùng nhận thông báo và đánh dấu "Đã uống"
7. Hệ thống cập nhật trạng thái và hủy các thông báo còn lại

**B.3.3 Luồng liên kết Caregiver:**
1. Patient tạo mã liên kết 6 chữ số
2. Patient chia sẻ mã cho Caregiver
3. Caregiver nhập mã vào ứng dụng
4. Hệ thống tạo yêu cầu liên kết (status: pending)
5. Patient nhận thông báo có yêu cầu liên kết
6. Patient xem thông tin Caregiver và chấp nhận/từ chối
7. Nếu chấp nhận, hệ thống liên kết Caregiver với Patient
8. Caregiver có thể xem thông tin sức khỏe của Patient

**B.3.4 Luồng ghi nhận triệu chứng và cảnh báo:**
1. Patient ghi nhận triệu chứng với mức độ nghiêm trọng
2. Hệ thống lưu thông tin triệu chứng
3. Nếu mức độ >= 7, hệ thống tạo cảnh báo
4. Hệ thống gửi cảnh báo cho Caregiver (nếu đã liên kết)
5. Caregiver nhận cảnh báo và xem chi tiết
6. Caregiver có thể đánh dấu đã đọc cảnh báo

**B.3.5 Luồng xem báo cáo:**
1. Người dùng chọn "Báo cáo"
2. Chọn khoảng thời gian: hôm nay, tuần này, tháng này, 7 ngày, 30 ngày
3. Hệ thống tính toán và hiển thị các thống kê
4. Người dùng có thể chọn "Phân tích bằng AI"
5. Hệ thống gửi dữ liệu báo cáo đến AI
6. AI phân tích và đưa ra lưu ý
7. Hệ thống hiển thị kết quả phân tích
8. Người dùng có thể xuất báo cáo PDF

---

## Appendix C: Issues List

### C.1 Các điểm chưa rõ cần xác nhận

1. **Phiên bản hệ điều hành tối thiểu:** Cần xác định phiên bản Android và iOS tối thiểu mà ứng dụng hỗ trợ.

2. **Chức năng offline:** Cần xác nhận ứng dụng có hỗ trợ hoạt động offline không, và mức độ hỗ trợ đến đâu (ghi nhận dữ liệu local, đồng bộ sau khi có mạng).

3. **Dịch vụ AI:** Cần xác định nhà cung cấp dịch vụ AI cụ thể và các giới hạn sử dụng (số lượng request, chi phí).

4. **Dịch vụ lưu trữ đám mây:** Cần xác định nhà cung cấp dịch vụ lưu trữ ảnh và giới hạn dung lượng.

5. **Dịch vụ thông báo đẩy:** Cần xác định phương thức gửi thông báo đẩy (FCM, Expo Push Notifications, v.v.).

6. **Kích thước ứng dụng:** Cần xác định kích thước tối đa của ứng dụng và dung lượng lưu trữ dữ liệu local.

7. **Thời gian phản hồi:** Cần xác định các ngưỡng thời gian phản hồi cụ thể cho từng loại thao tác.

8. **Tỷ lệ uptime:** Cần xác định yêu cầu cụ thể về tỷ lệ uptime của server.

9. **Cơ chế hỗ trợ:** Cần xác định phương thức liên hệ hỗ trợ (email, hotline, chat) và thời gian phản hồi.

10. **Chính sách bảo mật:** Cần xác định các quy định cụ thể về bảo vệ dữ liệu cá nhân mà hệ thống phải tuân thủ.

### C.2 Các nội dung cần bổ sung

1. **Chi tiết về phân quyền:** Cần làm rõ các quyền cụ thể của Caregiver đối với từng loại dữ liệu của Patient.

2. **Chi tiết về thông báo:** Cần mô tả chi tiết hơn về các loại thông báo, nội dung, và cách hiển thị.

3. **Chi tiết về báo cáo:** Cần mô tả chi tiết hơn về các loại biểu đồ và cách trình bày dữ liệu trong báo cáo.

4. **Chi tiết về giao diện:** Cần mô tả chi tiết hơn về layout, màu sắc, font chữ, và các nguyên tắc thiết kế UI/UX.

5. **Chi tiết về xử lý lỗi:** Cần mô tả cách hệ thống xử lý các lỗi có thể xảy ra và thông báo cho người dùng.

---

**Kết thúc tài liệu SRS**

---
