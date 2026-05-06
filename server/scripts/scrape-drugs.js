/**
 * Script thu thập danh mục thuốc từ nguồn chính thống Việt Nam
 * 
 * Nguồn 1: Cục Quản lý Dược (DAV) — Thuốc không kê đơn  
 *   → Dùng Puppeteer (headless browser) vì trang dùng Kendo UI + session cookies
 * 
 * Nguồn 2: BV Đa khoa Đồng Nai — Danh mục thuốc bệnh viện  
 *   → Dùng axios + cheerio (HTML table đơn giản)
 * 
 * Chạy: node scripts/scrape-drugs.js [dav|dongnai|all] [--import] [--limit=N]
 * Kết quả: tạo file data/scraped_drugs.json + tùy chọn import vào MongoDB
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// NGUỒN 1: CỤC QUẢN LÝ DƯỢC (DAV) — Puppeteer
// ═══════════════════════════════════════════════════════════════════

async function scrapeDAV(limit) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.log('  ⚠ Puppeteer chưa cài. Chạy: npm install puppeteer');
    console.log('  → Bỏ qua nguồn DAV, dùng nguồn Đồng Nai thay thế.');
    return [];
  }

  console.log('\n═══ [1/2] Thu thập từ Cục Quản lý Dược (DAV) ═══');
  const allDrugs = [];

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    console.log('  🌐 Mở trang DAV...');
    await page.goto('https://dichvucong.dav.gov.vn/congbothuockhongkedon/index', {
      waitUntil: 'networkidle2', timeout: 30000
    });

    // Chờ bảng dữ liệu load
    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    let pageNum = 1;
    let hasNextPage = true;
    const maxDrugs = limit || 5000;

    while (hasNextPage && allDrugs.length < maxDrugs) {
      console.log(`  📥 Trang ${pageNum}...`);

      // Extract data từ bảng hiện tại
      const rows = await page.evaluate(() => {
        const data = [];
        document.querySelectorAll('table tbody tr').forEach(row => {
          const cols = row.querySelectorAll('td');
          if (cols.length >= 9) {
            data.push({
              stt: (cols[0]?.textContent || '').trim(),
              soGPLH: (cols[2]?.textContent || '').trim(),
              ngayHetHan: (cols[3]?.textContent || '').trim(),
              tenThuoc: (cols[4]?.textContent || '').trim(),
              hoatChat: (cols[8]?.textContent || '').trim(),
              hamLuong: (cols[9]?.textContent || '').trim(),
              soQuyetDinh: (cols[10]?.textContent || '').trim(),
            });
          }
        });
        return data;
      });

      for (const item of rows) {
        if (item.tenThuoc) {
          allDrugs.push({
            source: 'DAV',
            name: item.tenThuoc,
            activeIngredient: item.hoatChat,
            dosage: item.hamLuong,
            registrationNumber: item.soGPLH,
            decisionNumber: item.soQuyetDinh,
            expiryDate: item.ngayHetHan,
          });
        }
      }

      console.log(`    ✓ ${rows.length} dòng, tổng: ${allDrugs.length} thuốc`);

      if (allDrugs.length >= maxDrugs) break;

      // Tìm và click nút trang tiếp theo
      try {
        const nextBtn = await page.$('.k-pager-wrap .k-pager-nav:last-child:not(.k-state-disabled)');
        if (!nextBtn) {
          // Thử tìm theo text
          const btns = await page.$$('a[title="Go to the next page"], .k-i-arrow-60-right, [aria-label="next"]');
          if (btns.length > 0) {
            await btns[0].click();
          } else {
            hasNextPage = false;
            continue;
          }
        } else {
          await nextBtn.click();
        }
        // Chờ bảng reload
        await page.waitForResponse(res => res.url().includes('congbothuockhongkedon'), { timeout: 10000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 1500));
        pageNum++;
      } catch {
        hasNextPage = false;
      }
    }
  } catch (err) {
    console.error(`  ❌ Lỗi DAV: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log(`  ✅ DAV hoàn thành: ${allDrugs.length} thuốc`);
  return allDrugs;
}

// ═══════════════════════════════════════════════════════════════════
// NGUỒN 2: BV ĐA KHOA ĐỒNG NAI — Scrape HTML table
// ═══════════════════════════════════════════════════════════════════

async function scrapeDongNai(limit) {
  console.log('\n═══ [2/2] Thu thập từ BV Đa khoa Đồng Nai ═══');
  const allDrugs = [];
  const baseUrl = 'https://khoaduocbvdkdongnai.org/index.php?nv=danhmucthuoc&year=2023';
  const maxPages = limit ? Math.ceil(limit / 20) : 60;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
      console.log(`  📥 Trang ${page}/${maxPages}...`);

      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmartCare/1.0' },
        timeout: 15000,
        responseType: 'arraybuffer',
      });

      // Handle encoding (trang có thể dùng UTF-8 hoặc Windows-1252)
      let html;
      try {
        html = new TextDecoder('utf-8').decode(res.data);
      } catch {
        html = res.data.toString('latin1');
      }

      const $ = cheerio.load(html);

      // Tìm bảng danh mục thuốc
      let found = 0;
      $('table tr').each((i, row) => {
        if (i === 0) return; // Skip header
        const cols = $(row).find('td');
        if (cols.length >= 6) {
          const stt = $(cols[0]).text().trim();
          const activeIngredient = $(cols[1]).text().trim();
          const name = $(cols[2]).text().trim();
          const dosage = $(cols[3]).text().trim();
          const dosageForm = $(cols[4]).text().trim();
          const manufacturer = $(cols[5]).text().trim();
          const country = cols.length > 6 ? $(cols[6]).text().trim() : '';

          if ((name || activeIngredient) && stt && !isNaN(parseInt(stt))) {
            allDrugs.push({
              source: 'DONG_NAI',
              name: name || activeIngredient,
              activeIngredient,
              dosage,
              dosageForm,
              manufacturer,
              country,
            });
            found++;
          }
        }
      });

      console.log(`    ✓ Trang ${page}: +${found} thuốc (tổng ${allDrugs.length})`);
      if (found === 0 && page > 1) {
        console.log('    ⚠ Không có dữ liệu — dừng.');
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`    ❌ Lỗi trang ${page}: ${err.message}`);
    }
  }

  console.log(`  ✅ Đồng Nai hoàn thành: ${allDrugs.length} thuốc`);
  return allDrugs;
}

// ═══════════════════════════════════════════════════════════════════
// MERGE + DEDUPLICATE + SAVE
// ═══════════════════════════════════════════════════════════════════

function deduplicateByName(drugs) {
  const seen = new Map();
  for (const drug of drugs) {
    const key = drug.name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, drug);
    } else {
      const existing = seen.get(key);
      if (!existing.activeIngredient && drug.activeIngredient) existing.activeIngredient = drug.activeIngredient;
      if (!existing.manufacturer && drug.manufacturer) existing.manufacturer = drug.manufacturer;
      if (!existing.dosageForm && drug.dosageForm) existing.dosageForm = drug.dosageForm;
      if (!existing.dosage && drug.dosage) existing.dosage = drug.dosage;
    }
  }
  return Array.from(seen.values());
}

function mapToSmartCareSchema(drug) {
  const ingredient = (drug.activeIngredient || '').toLowerCase();
  let category = 'OTHER';

  if (/paracetamol|ibuprofen|diclofenac|meloxicam|naproxen|celecoxib|tramadol|morphin|piroxicam|ketorolac/i.test(ingredient)) category = 'ANALGESIC';
  else if (/amoxicillin|ampicillin|cephalexin|cefuroxime|azithromycin|ciprofloxacin|metronidazole|levofloxacin|clarithromycin|ceftriaxone|amikacin|gentamicin|meropenem|vancomycin|cefixime|cefpodoxime|doxycycline|erythromycin|clindamycin|co-trimoxazole|nitrofurantoin/i.test(ingredient)) category = 'ANTIBIOTIC';
  else if (/amlodipine|losartan|enalapril|perindopril|bisoprolol|valsartan|captopril|nifedipine|ramipril|hydrochlorothiazide|furosemide|spironolactone|telmisartan|irbesartan|indapamide/i.test(ingredient)) category = 'ANTIHYPERTENSIVE';
  else if (/metformin|glimepiride|glipizide|insulin|gliclazide|sitagliptin|empagliflozin|acarbose|dapagliflozin|vildagliptin|pioglitazone/i.test(ingredient)) category = 'ANTIDIABETIC';
  else if (/aspirin|atorvastatin|rosuvastatin|clopidogrel|warfarin|digoxin|simvastatin|fenofibrate|rivaroxaban|dabigatran/i.test(ingredient)) category = 'CARDIOVASCULAR';
  else if (/omeprazole|pantoprazole|esomeprazole|ranitidine|domperidone|sucralfate|loperamide|metoclopramide|bismuth|famotidine|lansoprazole/i.test(ingredient)) category = 'GASTRIC';
  else if (/vitamin|calcium|folic|zinc|iron|ascorbic|cholecalciferol|thiamine|riboflavin|pyridoxine|cobalamin|magnesium/i.test(ingredient)) category = 'VITAMIN';
  else if (/loratadine|cetirizine|fexofenadine|chlorpheniramine|prednisolone|dexamethasone|methylprednisolone|promethazine|desloratadine|bilastine/i.test(ingredient)) category = 'ANTIHISTAMINE';
  else if (/salbutamol|montelukast|bromhexine|acetylcysteine|theophylline|budesonide|fluticasone|ipratropium|terbutaline|ambroxol/i.test(ingredient)) category = 'RESPIRATORY';
  else if (/allopurinol|colchicine|hydroxychloroquine|methotrexate|sulfasalazine|leflunomide/i.test(ingredient)) category = 'MUSCULOSKELETAL';
  else if (/gabapentin|amitriptyline|sertraline|carbamazepine|levetiracetam|diazepam|alprazolam|escitalopram|fluoxetine|phenytoin|valproic|lamotrigine/i.test(ingredient)) category = 'NEUROLOGICAL';

  return {
    name: drug.name,
    activeIngredient: drug.activeIngredient || '',
    category,
    defaultDosage: drug.dosage || '1 viên/lần',
    defaultSessions: ['MORNING'],
    defaultMealTiming: 'AFTER_MEAL',
    unit: 'viên',
    price: 0,
    stock: 100,
    notes: [drug.dosageForm, drug.manufacturer, drug.country].filter(Boolean).join(' · '),
    _source: drug.source,
    _registrationNumber: drug.registrationNumber || '',
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  SmartCare — Thu thập Danh mục Thuốc Quốc gia   ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const args = process.argv.slice(2);
  const sourceArg = args.find(a => !a.startsWith('--')) || 'all';
  const limitMatch = args.find(a => a.startsWith('--limit='));
  const limit = limitMatch ? parseInt(limitMatch.split('=')[1]) : null;

  let davDrugs = [];
  let dongNaiDrugs = [];

  if (sourceArg === 'all' || sourceArg === 'dav') {
    davDrugs = await scrapeDAV(limit);
  }

  if (sourceArg === 'all' || sourceArg === 'dongnai') {
    dongNaiDrugs = await scrapeDongNai(limit);
  }

  const allRaw = [...davDrugs, ...dongNaiDrugs];
  console.log(`\n📊 Tổng raw: ${allRaw.length} thuốc`);

  const unique = deduplicateByName(allRaw);
  console.log(`📊 Sau deduplicate: ${unique.length} thuốc`);

  const mapped = unique.map(mapToSmartCareSchema);

  // Thống kê
  const byCat = {};
  for (const d of mapped) {
    byCat[d.category] = (byCat[d.category] || 0) + 1;
  }
  console.log('\n📋 Phân loại:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} thuốc`);
  });

  // Save JSON
  const outputPath = path.join(__dirname, '..', 'data', 'scraped_drugs.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(mapped, null, 2), 'utf8');
  console.log(`\n💾 Đã lưu: ${outputPath} (${mapped.length} thuốc)`);

  // Import vào MongoDB
  if (args.includes('--import')) {
    console.log('\n📦 Nhập vào MongoDB...');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    const mongoose = require('mongoose');
    const DrugCatalog = require('../src/models/DrugCatalog');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('  ✓ Đã kết nối MongoDB');

    let added = 0, skipped = 0;
    for (const drug of mapped) {
      const escaped = drug.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existing = await DrugCatalog.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
      if (!existing) {
        await DrugCatalog.create(drug);
        added++;
      } else {
        skipped++;
      }
    }

    console.log(`  ✅ Import: +${added} mới, ${skipped} đã có`);
    const total = await DrugCatalog.countDocuments();
    console.log(`  📊 Tổng trong DB: ${total} thuốc`);
    await mongoose.disconnect();
  }

  console.log('\n✅ Hoàn tất!');
  if (!args.includes('--import')) {
    console.log('💡 Chạy với --import để nhập vào MongoDB:');
    console.log('   node scripts/scrape-drugs.js dongnai --import');
    console.log('   node scripts/scrape-drugs.js all --import');
    console.log('   node scripts/scrape-drugs.js dongnai --import --limit=500');
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
