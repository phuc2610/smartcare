/**
 * Medication Time Constants
 * Chuẩn hóa giờ nhắc thuốc toàn app
 *
 * Range logic:
 *  - Đầu range: nhắc "Đã đến giờ uống thuốc"
 *  - Cuối range: nhắc trễ nếu chưa uống "Bạn chưa uống thuốc, đừng quên!"
 */

export const SESSION_DEFAULT_TIMES: Record<string, string> = {
  MORNING: '07:00',  // nhắc chính giữa range sáng (6-9h)
  NOON:    '11:00',  // nhắc chính giữa range trưa (10-14h)
  EVENING: '18:00',  // nhắc chính giữa range tối (17-20h)
};

export const SESSION_RANGES: Record<string, { start: string; end: string }> = {
  MORNING: { start: '06:00', end: '09:00' },
  NOON:    { start: '10:00', end: '14:00' },
  EVENING: { start: '17:00', end: '20:00' },
};

export const SESSION_LABELS: Record<string, string> = {
  MORNING: 'Sáng',
  NOON:    'Trưa',
  EVENING: 'Tối',
};

/** Parse "HH:mm" → { hours, minutes } */
export const parseTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
};
