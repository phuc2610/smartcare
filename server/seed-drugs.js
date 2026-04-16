require('dotenv').config();
const mongoose = require('mongoose');
const DrugCatalog = require('./src/models/DrugCatalog');

const FULL_CATALOG = [
  // GIẢM ĐAU / HẠ SỐT
  { name: 'Paracetamol 500mg', activeIngredient: 'Paracetamol', category: 'ANALGESIC', defaultDosage: '1-2 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 500, stock: 500, notes: 'Không dùng quá 4g/ngày' },
  { name: 'Ibuprofen 400mg', activeIngredient: 'Ibuprofen', category: 'ANALGESIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 1500, stock: 300, contraindications: 'Loét dạ dày, suy thận' },
  { name: 'Diclofenac 50mg', activeIngredient: 'Diclofenac', category: 'ANALGESIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 200 },
  { name: 'Indomethacin 25mg', activeIngredient: 'Indomethacin', category: 'ANALGESIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 1800, stock: 150 },
  { name: 'Tramadol 50mg', activeIngredient: 'Tramadol', category: 'ANALGESIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 100 },
  { name: 'Methocarbamol 750mg', activeIngredient: 'Methocarbamol', category: 'ANALGESIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3500, stock: 120 },
  // KHÁNG SINH
  { name: 'Amoxicillin 500mg', activeIngredient: 'Amoxicillin', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3000, stock: 200, notes: 'Uống đủ 7-10 ngày' },
  { name: 'Amoxicillin-Clavulanate 875/125mg', activeIngredient: 'Amoxicillin + Clavulanic acid', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 12000, stock: 120 },
  { name: 'Clarithromycin 500mg', activeIngredient: 'Clarithromycin', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 15000, stock: 100 },
  { name: 'Azithromycin 500mg', activeIngredient: 'Azithromycin', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 18000, stock: 90 },
  { name: 'Metronidazole 500mg', activeIngredient: 'Metronidazole', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2500, stock: 180, notes: 'Kiêng rượu trong và 48h sau điều trị' },
  { name: 'Ciprofloxacin 500mg', activeIngredient: 'Ciprofloxacin', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 100 },
  { name: 'Nitrofurantoin 100mg', activeIngredient: 'Nitrofurantoin', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 6000, stock: 120 },
  // HẠ HUYẾT ÁP
  { name: 'Amlodipine 5mg', activeIngredient: 'Amlodipine', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 150 },
  { name: 'Amlodipine 10mg', activeIngredient: 'Amlodipine', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 100 },
  { name: 'Losartan 50mg', activeIngredient: 'Losartan', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 7000, stock: 120 },
  { name: 'Perindopril 5mg', activeIngredient: 'Perindopril', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 9000, stock: 100 },
  { name: 'Bisoprolol 5mg', activeIngredient: 'Bisoprolol', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 6000, stock: 130 },
  { name: 'Hydrochlorothiazide 25mg', activeIngredient: 'Hydrochlorothiazide', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 200 },
  { name: 'Furosemide 40mg', activeIngredient: 'Furosemide', category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 1500, stock: 200 },
  // TIỂU ĐƯỜNG
  { name: 'Metformin 500mg', activeIngredient: 'Metformin', category: 'ANTIDIABETIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 200, notes: 'Uống cùng bữa ăn' },
  { name: 'Metformin 1000mg', activeIngredient: 'Metformin', category: 'ANTIDIABETIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3500, stock: 150 },
  { name: 'Glipizide 5mg', activeIngredient: 'Glipizide', category: 'ANTIDIABETIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 4000, stock: 150 },
  { name: 'Sitagliptin 100mg', activeIngredient: 'Sitagliptin', category: 'ANTIDIABETIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 35000, stock: 80 },
  { name: 'Empagliflozin 10mg', activeIngredient: 'Empagliflozin', category: 'ANTIDIABETIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 45000, stock: 60 },
  { name: 'Insulin Glargine (Lantus)', activeIngredient: 'Insulin glargine', category: 'ANTIDIABETIC', defaultDosage: '10-20 đv/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'đv', price: 8000, stock: 50 },
  // TIM MẠCH
  { name: 'Aspirin 81mg', activeIngredient: 'Acetylsalicylic acid', category: 'CARDIOVASCULAR', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 800, stock: 300 },
  { name: 'Atorvastatin 20mg', activeIngredient: 'Atorvastatin', category: 'CARDIOVASCULAR', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 150 },
  { name: 'Atorvastatin 40mg', activeIngredient: 'Atorvastatin', category: 'CARDIOVASCULAR', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 14000, stock: 100 },
  { name: 'Clopidogrel 75mg', activeIngredient: 'Clopidogrel', category: 'CARDIOVASCULAR', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 12000, stock: 100 },
  { name: 'Digoxin 0.25mg', activeIngredient: 'Digoxin', category: 'CARDIOVASCULAR', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3000, stock: 80 },
  { name: 'Warfarin 2.5mg', activeIngredient: 'Warfarin', category: 'CARDIOVASCULAR', defaultDosage: '1-2 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 80 },
  // DẠ DÀY
  { name: 'Omeprazole 20mg', activeIngredient: 'Omeprazole', category: 'GASTRIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 4000, stock: 250 },
  { name: 'Pantoprazole 40mg', activeIngredient: 'Pantoprazole', category: 'GASTRIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 6000, stock: 200 },
  { name: 'Esomeprazole 40mg', activeIngredient: 'Esomeprazole', category: 'GASTRIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 12000, stock: 150 },
  { name: 'Domperidone 10mg', activeIngredient: 'Domperidone', category: 'GASTRIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 2000, stock: 200 },
  { name: 'Sucralfate 1g', activeIngredient: 'Sucralfate', category: 'GASTRIC', defaultDosage: '1 gói/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'gói', price: 3500, stock: 150 },
  { name: 'Macrogol (PEG) 3350', activeIngredient: 'Macrogol 3350', category: 'GASTRIC', defaultDosage: '1 gói/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'gói', price: 10000, stock: 100 },
  { name: 'Bisacodyl 5mg', activeIngredient: 'Bisacodyl', category: 'GASTRIC', defaultDosage: '1-2 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 1500, stock: 200 },
  { name: 'Loperamide 2mg', activeIngredient: 'Loperamide', category: 'GASTRIC', defaultDosage: '2 viên đầu, 1 viên/lần sau', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 150 },
  { name: 'Smecta 3g', activeIngredient: 'Diosmectite', category: 'GASTRIC', defaultDosage: '1 gói/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'gói', price: 5000, stock: 120 },
  { name: 'Oresol (ORS)', activeIngredient: 'Natri clorid + Kali clorid + Glucose', category: 'GASTRIC', defaultDosage: '1 gói/200ml', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'gói', price: 3000, stock: 300 },
  // VITAMIN
  { name: 'Vitamin C 500mg', activeIngredient: 'Ascorbic acid', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 800, stock: 400 },
  { name: 'Vitamin B1 (Thiamine) 100mg', activeIngredient: 'Thiamine', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 1500, stock: 300 },
  { name: 'Vitamin B-complex', activeIngredient: 'B1 + B2 + B6 + B12', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 300 },
  { name: 'Vitamin D3 1000 IU', activeIngredient: 'Cholecalciferol', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 200 },
  { name: 'Calcium carbonate 500mg', activeIngredient: 'Calcium carbonate', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3000, stock: 250 },
  { name: 'Folic acid 5mg', activeIngredient: 'Folic acid', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 1500, stock: 200 },
  { name: 'Zinc 10mg', activeIngredient: 'Zinc sulfate', category: 'VITAMIN', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3000, stock: 200 },
  // DỊ ỨNG
  { name: 'Loratadine 10mg', activeIngredient: 'Loratadine', category: 'ANTIHISTAMINE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2500, stock: 180 },
  { name: 'Cetirizine 10mg', activeIngredient: 'Cetirizine', category: 'ANTIHISTAMINE', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3000, stock: 200 },
  { name: 'Fexofenadine 180mg', activeIngredient: 'Fexofenadine', category: 'ANTIHISTAMINE', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 120 },
  { name: 'Hydroxyzine 25mg', activeIngredient: 'Hydroxyzine', category: 'ANTIHISTAMINE', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 100 },
  { name: 'Prednisolone 5mg', activeIngredient: 'Prednisolone', category: 'ANTIHISTAMINE', defaultDosage: '1-2 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 200 },
  { name: 'Methylprednisolone 4mg', activeIngredient: 'Methylprednisolone', category: 'ANTIHISTAMINE', defaultDosage: '1-2 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 150 },
  // HÔ HẤP
  { name: 'Salbutamol 4mg', activeIngredient: 'Salbutamol', category: 'RESPIRATORY', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 200 },
  { name: 'Montelukast 10mg', activeIngredient: 'Montelukast', category: 'RESPIRATORY', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 15000, stock: 100 },
  { name: 'Bromhexine 8mg', activeIngredient: 'Bromhexine', category: 'RESPIRATORY', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 200 },
  { name: 'Acetylcysteine 200mg', activeIngredient: 'N-Acetylcysteine', category: 'RESPIRATORY', defaultDosage: '1 gói/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'gói', price: 8000, stock: 120 },
  { name: 'Codeine 10mg', activeIngredient: 'Codeine phosphate', category: 'RESPIRATORY', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 4000, stock: 80 },
  { name: 'Xylometazoline 0.1% xịt mũi', activeIngredient: 'Xylometazoline', category: 'RESPIRATORY', defaultDosage: '2-3 nhát/mũi', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'lọ', price: 25000, stock: 80 },
  { name: 'Fluticasone xịt mũi 50mcg', activeIngredient: 'Fluticasone propionate', category: 'RESPIRATORY', defaultDosage: '2 nhát/mũi', defaultSessions: ['MORNING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'lọ', price: 65000, stock: 60 },
  // CƠ XƯƠNG KHỚP
  { name: 'Allopurinol 300mg', activeIngredient: 'Allopurinol', category: 'MUSCULOSKELETAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 3000, stock: 150 },
  { name: 'Colchicine 0.6mg', activeIngredient: 'Colchicine', category: 'MUSCULOSKELETAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 6000, stock: 100 },
  { name: 'Potassium Citrate 1080mg', activeIngredient: 'Potassium citrate', category: 'MUSCULOSKELETAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 80 },
  { name: 'Hydroxychloroquine 200mg', activeIngredient: 'Hydroxychloroquine', category: 'MUSCULOSKELETAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 20000, stock: 60 },
  { name: 'Diclofenac gel 1% (50g)', activeIngredient: 'Diclofenac sodium', category: 'MUSCULOSKELETAL', defaultDosage: '3-4cm gel/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'tuýp', price: 45000, stock: 80 },
  // THẦN KINH / GIẤC NGỦ
  { name: 'Melatonin 3mg', activeIngredient: 'Melatonin', category: 'NEUROLOGICAL', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 100 },
  { name: 'Amitriptyline 25mg', activeIngredient: 'Amitriptyline', category: 'NEUROLOGICAL', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 4000, stock: 80 },
  { name: 'Sertraline 50mg', activeIngredient: 'Sertraline', category: 'NEUROLOGICAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 12000, stock: 80 },
  { name: 'Escitalopram 10mg', activeIngredient: 'Escitalopram', category: 'NEUROLOGICAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 18000, stock: 70 },
  { name: 'Sumatriptan 50mg', activeIngredient: 'Sumatriptan', category: 'NEUROLOGICAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 25000, stock: 60 },
  { name: 'Gabapentin 300mg', activeIngredient: 'Gabapentin', category: 'NEUROLOGICAL', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 8000, stock: 80 },
  // THẬN / TIẾT NIỆU
  { name: 'Tamsulosin 0.4mg', activeIngredient: 'Tamsulosin', category: 'UROLOGY', defaultDosage: '1 viên/lần', defaultSessions: ['EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 12000, stock: 80 },
  { name: 'Trimethoprim-Sulfamethoxazole 800/160mg', activeIngredient: 'Trimethoprim + Sulfamethoxazole', category: 'UROLOGY', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 100 },
];

async function main() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    let added = 0, skipped = 0;
    for (const drug of FULL_CATALOG) {
      const exists = await DrugCatalog.findOne({ name: new RegExp('^' + drug.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
      if (!exists) {
        await DrugCatalog.create(drug);
        added++;
        process.stdout.write('+');
      } else {
        skipped++;
        process.stdout.write('.');
      }
    }

    const total = await DrugCatalog.countDocuments({ isActive: true });
    console.log('\n');
    console.log('=== SEED COMPLETE ===');
    console.log('Added  :', added);
    console.log('Skipped:', skipped);
    console.log('Total  :', total, 'drugs in catalog');
    await mongoose.disconnect();
  } catch (err) {
    console.error('SEED ERROR:', err.message);
    process.exit(1);
  }
}

main();
