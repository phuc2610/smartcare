
import { ReportSummary, User, ReminderStatus } from "../types";

/**
 * Generates an HTML string for the PDF report.
 * Uses inline CSS for compatibility with basic print engines.
 */
export const generateHTML = (user: User, report: ReportSummary) => {
  
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0099ff; padding-bottom: 20px; }
          .title { font-size: 26px; font-weight: bold; color: #0099ff; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; font-style: italic; }
          
          .section { margin-bottom: 35px; page-break-inside: avoid; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #0099ff; padding-left: 10px; background: #f0f9ff; padding-top: 5px; padding-bottom: 5px; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
          .info-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-value { font-size: 15px; font-weight: 600; color: #111; }

          .stats-row { display: flex; justify-content: space-between; gap: 10px; }
          .stat-card { flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
          .stat-num { font-size: 24px; font-weight: bold; color: #0099ff; margin-bottom: 4px; }
          .stat-desc { font-size: 11px; color: #666; }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { text-align: left; background-color: #f3f4f6; padding: 10px; font-weight: 600; border-bottom: 2px solid #e5e7eb; color: #4b5563; }
          td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; }
          
          .status-tag { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; display: inline-block; }
          .status-taken { background: #d1fae5; color: #047857; }
          .status-missed { background: #fee2e2; color: #b91c1c; }
          .status-pending { background: #fef3c7; color: #b45309; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9aa5b1; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Báo Cáo Sức Khỏe SmartCare</div>
          <div class="subtitle">Từ ngày ${report.startDate} đến ngày ${report.endDate}</div>
        </div>

        <!-- USER PROFILE -->
        <div class="section">
          <div class="section-title">Thông tin bệnh nhân</div>
          <div class="grid-2">
            <div class="info-box">
               <div class="info-label">Họ và tên</div>
               <div class="info-value">${user.name}</div>
            </div>
            <div class="info-box">
               <div class="info-label">Bệnh lý</div>
               <div class="info-value">${user.medicalCondition || 'Không rõ'}</div>
            </div>
          </div>
        </div>

        <!-- MEDICATION ADHERENCE -->
        <div class="section">
          <div class="section-title">Tuân thủ điều trị</div>
          <div class="stats-row">
             <div class="stat-card">
               <div class="stat-num" style="color: #4f46e5">${report.medicationAdherence.total}</div>
               <div class="stat-desc">Tổng liều thuốc</div>
             </div>
             <div class="stat-card">
               <div class="stat-num" style="color: #10b981">${report.medicationAdherence.taken}</div>
               <div class="stat-desc">Đã uống</div>
             </div>
             <div class="stat-card">
               <div class="stat-num" style="color: #f59e0b">${report.medicationAdherence.rate}%</div>
               <div class="stat-desc">Tỷ lệ tuân thủ</div>
             </div>
          </div>
        </div>

        <!-- HEALTH & WELLNESS -->
        <div class="section">
          <div class="section-title">Sức khỏe & Lối sống</div>
          <div class="grid-2">
            <!-- Nutrition -->
            <div class="info-box" style="border-left: 3px solid #f97316">
               <div class="info-label" style="color: #f97316">Dinh dưỡng & Vận động</div>
               <div style="margin-top: 8px; display: flex; justify-content: space-between;">
                  <div>
                    <div style="font-size: 18px; font-weight: bold;">${report.healthStats.totalCaloriesIn}</div>
                    <div style="font-size: 10px; color: #888;">Nạp vào (kcal)</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: bold;">${report.healthStats.totalCaloriesOut}</div>
                    <div style="font-size: 10px; color: #888;">Tiêu hao (kcal)</div>
                  </div>
               </div>
            </div>
            
            <!-- Wellness -->
            <div class="info-box" style="border-left: 3px solid #a855f7">
               <div class="info-label" style="color: #a855f7">Sức khỏe tinh thần</div>
               <div style="margin-top: 8px; display: flex; justify-content: space-between;">
                  <div>
                    <div style="font-size: 18px; font-weight: bold;">${report.wellnessStats.sessionsCount}</div>
                    <div style="font-size: 10px; color: #888;">Số phiên tập</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: bold;">${report.wellnessStats.totalMinutes}</div>
                    <div style="font-size: 10px; color: #888;">Phút thư giãn</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <!-- DETAILED HISTORY -->
        <div class="section">
          <div class="section-title">Chi tiết lịch sử thuốc</div>
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Tên thuốc</th>
                <th>Liều lượng</th>
                <th style="text-align: center;">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${report.reminders.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px;">Không có dữ liệu trong khoảng thời gian này</td></tr>' : ''}
              ${report.reminders.map(r => {
                let statusClass = 'status-pending';
                let statusText = 'Chưa uống';
                if (r.status === ReminderStatus.TAKEN) { statusClass = 'status-taken'; statusText = 'Đã uống'; }
                if (r.status === ReminderStatus.SKIPPED) { statusClass = 'status-missed'; statusText = 'Bỏ qua'; }
                
                return `
                  <tr>
                    <td>${new Date(r.scheduledTime).toLocaleString('vi-VN')}</td>
                    <td>${r.medicationName}</td>
                    <td>${r.dosage} ${r.unit}</td>
                    <td style="text-align: center;"><span class="status-tag ${statusClass}">${statusText}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          Được tạo bởi SmartCare AI • Giúp bạn sống khỏe mỗi ngày.
        </div>
      </body>
    </html>
  `;
};

/**
 * Prints the HTML string to PDF using the browser's native capabilities.
 * Mimics `expo-print` behavior in a web environment.
 */
export const printToFileAsync = async (html: string) => {
  // Open a new window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Vui lòng cho phép popup để xuất PDF.");
    return;
  }

  // Write HTML to the window
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for resources to load then print
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 800);
};
