const PDFDocument = require('pdfkit');
const path = require('path');

/**
 * Tạo PDF đơn thuốc / hồ sơ khám bệnh theo chuẩn mẫu
 * @param {Object} record – MedicalRecord đã populate đầy đủ
 * @param {Object} patient – User (bệnh nhân)
 * @returns {PDFDocument} – PDF stream, caller cần pipe vào response
 */
function generatePrescriptionPDF(record, patient) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
    info: {
      Title: `Don thuoc - ${patient.name}`,
      Author: record.doctorId?.name || 'SmartCare',
      Subject: 'Hồ sơ khám bệnh',
      Creator: 'SmartCare Platform',
    },
  });

  // Đăng ký font hỗ trợ Tiếng Việt (Roboto)
  const fontRegular = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
  const fontBold = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
  const fontItalic = path.join(__dirname, '../assets/fonts/Roboto-Italic.ttf');
  
  doc.registerFont('Roboto', fontRegular);
  doc.registerFont('Roboto-Bold', fontBold);
  doc.registerFont('Roboto-Italic', fontItalic);

  const leftX = 50;
  const pageWidth = doc.page.width - 100;
  
  // Helpers
  const fmtDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const sessionLabel = (s) => ({ MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' }[s] || s);
  const mealLabel = (m) => ({ BEFORE_MEAL: 'Trước khi ăn', AFTER_MEAL: 'Sau khi ăn', NONE: '' }[m] || '');

  // ─── HEADER ──────────────────────────────────────────────────────────────────
  const doctorName = record.doctorId?.name || 'Bác sĩ';
  const hospital = record.doctorId?.doctorProfile?.hospital || 'PHÒNG KHÁM SMARTCARE';
  const phone = record.doctorId?.phone || '1900 xxxx';
  
  // Fake Logo "A" (since we don't have the image, we draw a large stylized text)
  doc.font('Roboto-Bold').fontSize(40).text('S', leftX, 40, { width: 50, align: 'center' }); 
  
  // Thông tin phòng khám/bệnh viện
  doc.font('Roboto-Bold').fontSize(12).text(hospital.toUpperCase(), leftX + 60, 45);
  doc.font('Roboto').fontSize(10)
    .text('Hệ thống Y tế Thông minh SmartCare', leftX + 60, 60)
    .text(`ĐT: ${phone}`, leftX + 60, 75)
    .text('Website: smartcare.local', leftX + 60, 90);

  // Mã toa & Mã BA (Góc trên phải)
  const recordIdStr = record._id ? record._id.toString().slice(-6).toUpperCase() : 'N/A';
  const patientIdStr = patient._id ? patient._id.toString().slice(-6).toUpperCase() : 'N/A';
  
  doc.fontSize(11);
  doc.text(`Mã toa: SC-${recordIdStr}`, leftX + pageWidth - 160, 45, { width: 160, align: 'right' });
  doc.text(`Mã BA: BN-${patientIdStr}`, leftX + pageWidth - 160, 60, { width: 160, align: 'right' });

  // ─── TITLE ───────────────────────────────────────────────────────────────────
  let y = 140;
  doc.font('Roboto-Bold').fontSize(22).text('ĐƠN THUỐC', leftX, y, { align: 'center', width: pageWidth });
  y += 40;

  // ─── THÔNG TIN BỆNH NHÂN ─────────────────────────────────────────────────────
  doc.font('Roboto').fontSize(12);
  
  // Dòng 1: Bệnh nhân ... Năm sinh ...
  doc.text('Bệnh nhân: ', leftX, y, { continued: true });
  doc.font('Roboto-Bold').text(`${patient.name.toUpperCase()} `, { continued: true });
  
  // Căn lề phải cho Năm sinh trên cùng một dòng
  doc.font('Roboto').text('                              Năm sinh: .....', { align: 'right' });
  y += 22;

  // Dòng 2: Địa chỉ
  doc.font('Roboto').text(`Địa chỉ: .....`, leftX, y);
  y += 22;

  // Dòng 3: Chẩn đoán
  const diag = record.diagnosis ? (record.icdCode ? `${record.diagnosis} (${record.icdCode})` : record.diagnosis) : '..........';
  doc.text('Chẩn đoán: ', leftX, y, { continued: true });
  doc.font('Roboto').text(`${diag}`);
  y += 35;

  // ─── DANH SÁCH THUỐC ─────────────────────────────────────────────────────────
  const meds = record.prescriptionIds || [];
  if (meds.length > 0) {
    meds.forEach((med, idx) => {
      // Sang trang mới nếu hết chỗ
      if (y > 650) {
        doc.addPage();
        y = 50;
      }
      
      doc.font('Roboto').fontSize(12);
      
      // Dòng 1 của thuốc: "1. Tên thuốc   Hàm lượng  -   SL: ..."
      const idxText = `${idx + 1}. `;
      doc.text(idxText, leftX, y, { continued: true });
      doc.font('Roboto').text(`${med.name} `, { continued: true });
      doc.font('Roboto').text(`${med.dosage || ''}`);
      
      // Căn lề phải cho số lượng
      doc.text('-   SL: Theo toa', leftX, y, { align: 'right', width: pageWidth - 40 });
      y += 22;

      // Dòng 2 của thuốc: Lùi lề vào trong "Một ngày uống ... lần, mỗi lần ... Sau khi ăn"
      const sessionsCount = (med.sessions || []).length || 1;
      const sessionsStr = (med.sessions || []).map(sessionLabel).join(', ');
      const mealStr = mealLabel(med.mealTiming);
      
      const usageText = `Một ngày uống ${sessionsCount} lần. Các buổi: ${sessionsStr}. ${mealStr}`;
      doc.font('Roboto').text(usageText, leftX + 25, y);
      y += 20;

      // Dòng 3: Chú ý (Nếu có)
      if (med.notes) {
        doc.font('Roboto-Italic').text(`Chú ý: ${med.notes}`, leftX + 25, y);
        y += 20;
      }
      
      y += 5; // Khoảng cách giữa các thuốc
    });
  }

  // ─── FOOTER ──────────────────────────────────────────────────────────────────
  // Đảm bảo đủ không gian cho phần chữ ký (khoảng 150pt)
  if (y > 600) {
    doc.addPage();
    y = 50;
  } else {
    y = Math.max(y + 40, 550); // Đẩy chữ ký xuống dưới nếu danh sách ngắn
  }

  const signX = leftX + pageWidth - 250;
  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  // Footer Trái (Tái khám & Lời dặn)
  doc.font('Roboto-Bold').fontSize(12);
  doc.text(`Tái khám ngày: ${record.followUpDate ? fmtDate(record.followUpDate) : '...../...../..........'}`, leftX, y);
  doc.font('Roboto').text('Tại: Phòng khám.', leftX, y + 22);
  
  doc.text('Lời dặn:', leftX, y + 60);
  if (record.note) {
    doc.font('Roboto-Italic').text(record.note, leftX, y + 80, { width: 300 });
  }

  // Footer Phải (Ngày tháng, Bác sĩ điều trị)
  doc.font('Roboto').text(dateStr, signX, y, { width: 250, align: 'center' });
  doc.font('Roboto-Bold').text('Bác sĩ điều trị', signX, y + 22, { width: 250, align: 'center' });
  
  // Chữ ký (Để trống để ký tay)
  doc.font('Roboto-Italic').fillColor('#1E40AF').fontSize(24).text('SmartCare', signX, y + 50, { width: 250, align: 'center' }); // Chữ ký điện tử fake
  
  // Tên Bác sĩ ở dưới cùng
  doc.fillColor('black').font('Roboto-Bold').fontSize(12).text(`BS. ${doctorName}`, signX, y + 90, { width: 250, align: 'center' });

  // ─── BOTTOM DISCLAIMER ───────────────────────────────────────────────────────
  const disclaimerY = doc.page.height - 50;
  
  // Kẻ đường gạch ngang
  doc.moveTo(leftX, disclaimerY - 10)
     .lineTo(leftX + pageWidth, disclaimerY - 10)
     .lineWidth(1.5)
     .strokeColor('black')
     .stroke();
  
  doc.font('Roboto-Italic').fontSize(11);
  doc.text('Đơn thuốc dùng một lần - Vui lòng mang theo đơn thuốc khi tái khám', leftX, disclaimerY, { align: 'center', width: pageWidth });

  // In thời gian tạo (Góc dưới phải)
  const printTime = `${today.toLocaleDateString('vi-VN')} ${today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  doc.fontSize(8).text(printTime, leftX, disclaimerY + 2, { align: 'right', width: pageWidth });

  doc.end();
  return doc;
}

module.exports = { generatePrescriptionPDF };
