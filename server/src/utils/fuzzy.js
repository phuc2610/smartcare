/**
 * Tính khoảng cách Levenshtein giữa hai chuỗi a và b.
 * Khoảng cách càng nhỏ, hai chuỗi càng giống nhau.
 */
function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Tìm thuốc gần giống nhất từ danh sách cơ sở dữ liệu dựa trên khoảng cách Levenshtein.
 * Trả về { bestMatch: string, distance: number, score: number (0-1) }
 */
function findBestDrugMatch(inputName, drugDatabase) {
  if (!inputName || !drugDatabase || drugDatabase.length === 0) return null;

  const cleanInput = inputName.toLowerCase().trim();
  let bestMatch = null;
  let minDistance = Infinity;

  // Lọc bớt chữ "mg", "ml" để so khớp tên gốc dễ hơn nếu cần, nhưng tốt nhất cứ so sánh thô
  for (const drug of drugDatabase) {
    const cleanDrug = drug.toLowerCase().trim();
    const distance = getLevenshteinDistance(cleanInput, cleanDrug);

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = drug;
    }
  }

  const maxLength = Math.max(cleanInput.length, bestMatch.length);
  // Score: 1 là hoàn toàn khớp, 0 là khác biệt hoàn toàn
  const score = maxLength === 0 ? 1 : 1 - (minDistance / maxLength);

  return { bestMatch, distance: minDistance, score };
}

module.exports = {
  getLevenshteinDistance,
  findBestDrugMatch,
};
