const PDFDocument = require('pdfkit');

/**
 * Tạo PDF đơn thuốc / hồ sơ khám bệnh
 * @param {Object} record – MedicalRecord đã populate đầy đủ
 * @param {Object} patient – User (bệnh nhân)
 * @returns {PDFDocument} – PDF stream, caller cần pipe vào response
 */
function generatePrescriptionPDF(record, patient) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Đơn thuốc - ${patient.name}`,
      Author: record.doctorId?.name || 'SmartCare',
      Subject: 'Hồ sơ khám bệnh',
      Creator: 'SmartCare Platform',
    },
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;

  // ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
  const drawLine = (y, thickness = 0.5, color = '#CBD5E1') => {
    doc.save()
      .moveTo(leftX, y)
      .lineTo(leftX + pageWidth, y)
      .lineWidth(thickness)
      .strokeColor(color)
      .stroke()
      .restore();
  };

  const sessionLabel = (s) => ({ MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' }[s] || s);
  const mealLabel = (m) => ({ BEFORE_MEAL: 'Trước ăn', AFTER_MEAL: 'Sau ăn', NONE: '' }[m] || '');
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  // ─── HEADER ──────────────────────────────────────────────────────────────────
  doc.rect(leftX, 40, pageWidth, 80)
    .fill('#1E3A8A');

  doc.fillColor('#FFFFFF')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('SMARTCARE', leftX + 20, 55, { width: pageWidth - 40 });

  doc.fontSize(10)
    .font('Helvetica')
    .fillColor('#BFDBFE')
    .text('Hệ thống Quản lý Sức khoẻ Thông minh', leftX + 20, 82, { width: pageWidth - 40 });

  doc.fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .text('HỒ SƠ KHÁM BỆNH & ĐƠN THUỐC', leftX + 20, 100, {
      width: pageWidth - 40,
      align: 'right',
    });

  let y = 135;

  // ─── THÔNG TIN BỆNH NHÂN ────────────────────────────────────────────────────
  doc.rect(leftX, y, pageWidth, 24).fill('#EFF6FF');
  doc.fillColor('#1E40AF')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('THÔNG TIN BỆNH NHÂN', leftX + 10, y + 6);
  y += 32;

  const infoItems = [
    ['Họ tên:', patient.name || 'N/A'],
    ['Điện thoại:', patient.phone || 'N/A'],
    ['Tình trạng:', patient.medicalCondition || 'N/A'],
  ];

  if (patient.height) infoItems.push(['Chiều cao:', `${patient.height} cm`]);
  if (patient.weight) infoItems.push(['Cân nặng:', `${patient.weight} kg`]);

  doc.font('Helvetica').fontSize(10).fillColor('#1E293B');
  const colWidth = pageWidth / 2;
  for (let i = 0; i < infoItems.length; i += 2) {
    const [l1, v1] = infoItems[i];
    doc.font('Helvetica-Bold').text(l1, leftX + 10, y, { continued: true, width: 80 });
    doc.font('Helvetica').text(` ${v1}`, { width: colWidth - 90 });

    if (infoItems[i + 1]) {
      const [l2, v2] = infoItems[i + 1];
      doc.font('Helvetica-Bold').text(l2, leftX + colWidth + 10, y, { continued: true, width: 80 });
      doc.font('Helvetica').text(` ${v2}`, { width: colWidth - 90 });
    }
    y += 18;
  }
  y += 8;

  // ─── THÔNG TIN KHÁM ─────────────────────────────────────────────────────────
  doc.rect(leftX, y, pageWidth, 24).fill('#EFF6FF');
  doc.fillColor('#1E40AF')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('THÔNG TIN KHÁM', leftX + 10, y + 6);
  y += 32;

  const doctorName = record.doctorId?.name || 'N/A';
  const specialty = record.doctorId?.doctorProfile?.specialty || '';
  const hospital = record.doctorId?.doctorProfile?.hospital || '';
  const examDate = fmtDate(record.createdAt);

  doc.font('Helvetica').fontSize(10).fillColor('#1E293B');

  const examItems = [
    ['Bác sĩ:', `${doctorName}${specialty ? ' – ' + specialty : ''}`],
    ['Ngày khám:', examDate],
    ['Chẩn đoán:', record.diagnosis || 'N/A'],
  ];
  if (record.icdCode) examItems.push(['Mã ICD-10:', record.icdCode]);
  if (hospital) examItems.push(['Cơ sở:', hospital]);

  for (const [label, value] of examItems) {
    doc.font('Helvetica-Bold').text(label, leftX + 10, y, { continued: true, width: 90 });
    doc.font('Helvetica').text(` ${value}`, { width: pageWidth - 110 });
    y += 16;
  }
  y += 6;

  // ─── TRIỆU CHỨNG ────────────────────────────────────────────────────────────
  if (record.symptoms && record.symptoms.length > 0) {
    doc.rect(leftX, y, pageWidth, 24).fill('#FEF3C7');
    doc.fillColor('#92400E')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TRIỆU CHỨNG', leftX + 10, y + 6);
    y += 32;

    doc.fontSize(10).fillColor('#1E293B').font('Helvetica');
    for (const s of record.symptoms) {
      const severityText = s.severity <= 3 ? 'Nhẹ' : s.severity <= 6 ? 'Vừa' : 'Nặng';
      doc.text(`• ${s.name} — Mức độ: ${s.severity}/10 (${severityText})${s.notes ? ' – ' + s.notes : ''}`, leftX + 10, y, { width: pageWidth - 20 });
      y += 15;
    }
    y += 6;
  }

  // ─── DẤU HIỆU SINH TỒN ─────────────────────────────────────────────────────
  const vs = record.vitalSigns || {};
  const vitalItems = [];
  if (vs.bloodPressure) vitalItems.push(`HA: ${vs.bloodPressure} mmHg`);
  if (vs.heartRate) vitalItems.push(`Nhịp tim: ${vs.heartRate} bpm`);
  if (vs.temperature) vitalItems.push(`Nhiệt độ: ${vs.temperature}°C`);
  if (vs.weight) vitalItems.push(`Cân nặng: ${vs.weight} kg`);
  if (vs.spO2) vitalItems.push(`SpO2: ${vs.spO2}%`);
  if (vs.bloodSugar) vitalItems.push(`Đường huyết: ${vs.bloodSugar} mmol/L`);

  if (vitalItems.length > 0) {
    doc.rect(leftX, y, pageWidth, 24).fill('#ECFDF5');
    doc.fillColor('#065F46')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('DẤU HIỆU SINH TỒN', leftX + 10, y + 6);
    y += 32;

    doc.fontSize(10).fillColor('#1E293B').font('Helvetica');
    // Grid layout: 3 per row
    for (let i = 0; i < vitalItems.length; i += 3) {
      const row = vitalItems.slice(i, i + 3);
      const segW = pageWidth / 3;
      row.forEach((item, j) => {
        doc.text(`• ${item}`, leftX + 10 + j * segW, y, { width: segW - 10 });
      });
      y += 16;
    }
    y += 6;
  }

  // ─── ĐƠN THUỐC (TABLE) ──────────────────────────────────────────────────────
  const meds = record.prescriptionIds || [];
  if (meds.length > 0) {
    // Check if need new page
    if (y > 550) {
      doc.addPage();
      y = 50;
    }

    doc.rect(leftX, y, pageWidth, 24).fill('#F5F3FF');
    doc.fillColor('#5B21B6')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`ĐƠN THUỐC (${meds.length} loại)`, leftX + 10, y + 6);
    y += 32;

    // Table header
    const cols = [
      { label: 'STT', w: 30 },
      { label: 'Tên thuốc', w: 140 },
      { label: 'Liều', w: 80 },
      { label: 'Buổi uống', w: 80 },
      { label: 'Cách uống', w: 65 },
      { label: 'Thời gian', w: pageWidth - 30 - 140 - 80 - 80 - 65 },
    ];

    doc.rect(leftX, y, pageWidth, 20).fill('#E2E8F0');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B');
    let cx = leftX;
    for (const col of cols) {
      doc.text(col.label, cx + 4, y + 5, { width: col.w - 8, align: 'left' });
      cx += col.w;
    }
    y += 22;

    // Table rows
    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    meds.forEach((med, idx) => {
      // Alternate row background
      if (idx % 2 === 0) {
        doc.rect(leftX, y - 2, pageWidth, 28).fill('#F9FAFB');
        doc.fillColor('#374151');
      }

      // Check page break
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      cx = leftX;
      const sessionsStr = (med.sessions || []).map(sessionLabel).join(', ');
      const mealStr = mealLabel(med.mealTiming);
      const dateStr = `${fmtDate(med.startDate)}${med.endDate ? ' → ' + fmtDate(med.endDate) : ''}`;

      const rowData = [
        { text: String(idx + 1), w: cols[0].w },
        { text: med.name || 'N/A', w: cols[1].w },
        { text: med.dosage || '', w: cols[2].w },
        { text: sessionsStr, w: cols[3].w },
        { text: mealStr, w: cols[4].w },
        { text: dateStr, w: cols[5].w },
      ];

      for (const cell of rowData) {
        doc.text(cell.text, cx + 4, y, { width: cell.w - 8, align: 'left' });
        cx += cell.w;
      }
      y += 18;

      // Notes
      if (med.notes) {
        doc.fontSize(8).fillColor('#6B7280')
          .text(`   Lời dặn: ${med.notes}`, leftX + cols[0].w + 4, y, { width: pageWidth - cols[0].w - 10 });
        y += 12;
        doc.fontSize(9).fillColor('#374151');
      }
      y += 4;
    });

    drawLine(y, 1, '#7C3AED');
    y += 10;
  }

  // ─── GHI CHÚ & TÁI KHÁM ─────────────────────────────────────────────────────
  if (record.note || record.followUpDate) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }

    doc.rect(leftX, y, pageWidth, 24).fill('#FFFBEB');
    doc.fillColor('#92400E')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('GHI CHÚ & TÁI KHÁM', leftX + 10, y + 6);
    y += 32;

    doc.fontSize(10).fillColor('#1E293B').font('Helvetica');
    if (record.note) {
      doc.text(`Ghi chú: ${record.note}`, leftX + 10, y, { width: pageWidth - 20 });
      y += 20;
    }
    if (record.followUpDate) {
      doc.font('Helvetica-Bold')
        .text(`Ngày tái khám: ${fmtDate(record.followUpDate)}`, leftX + 10, y, { width: pageWidth - 20 });
      y += 20;
    }
    y += 10;
  }

  // ─── FOOTER ──────────────────────────────────────────────────────────────────
  const footerY = Math.max(y + 30, 700);
  if (footerY > 750) {
    doc.addPage();
  }

  const signY = footerY > 750 ? 600 : footerY;

  // Right-aligned signature area
  const signX = leftX + pageWidth - 200;
  doc.fontSize(10).fillColor('#374151').font('Helvetica');
  doc.text(`Ngày ${new Date().toLocaleDateString('vi-VN')}`, signX, signY, { width: 200, align: 'center' });
  doc.font('Helvetica-Bold')
    .text('Bác sĩ điều trị', signX, signY + 16, { width: 200, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#9CA3AF')
    .text('(Ký và ghi rõ họ tên)', signX, signY + 32, { width: 200, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E40AF')
    .text(doctorName, signX, signY + 60, { width: 200, align: 'center' });

  // Bottom disclaimer
  const disclaimerY = doc.page.height - 40;
  drawLine(disclaimerY - 8, 0.5, '#E5E7EB');
  doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica')
    .text('Đơn thuốc được tạo tự động bởi SmartCare Platform. Vui lòng liên hệ bác sĩ nếu có thắc mắc.',
      leftX, disclaimerY, { width: pageWidth, align: 'center' });

  doc.end();
  return doc;
}

module.exports = { generatePrescriptionPDF };
