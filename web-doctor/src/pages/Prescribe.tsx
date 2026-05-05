import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pill, Sun, CloudSun, Moon, Sparkles, AlertTriangle, CheckCircle, X, Loader, Plus, Thermometer, Heart, Stethoscope, RefreshCw, Send, Utensils, Building2 } from 'lucide-react';

interface DrugSuggestion {
  name: string;
  dosage: string;
  sessions: string[];
  mealTiming: string;
  notes: string;
  reason: string;
}

interface DrugInteraction {
  drugs: string[];
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  description: string;
  recommendation: string;
}

interface PrescriptionRow {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  sessions: string[];
  mealTiming: string;
  startDate: string;
  endDate: string;
  notes: string;
}

interface SymptomEntry {
  symptomName: string;
  severity: number; // 1-10
}

export default function Prescribe() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Patient info
  const [patientInfo, setPatientInfo] = useState<any>(null);

  const [rows, setRows] = useState<PrescriptionRow[]>([newRow(1)]);

  // AI Suggestion state
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Catalog autocomplete state
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Symptom inputs
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState(5);

  // Chẩn đoán
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode]     = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // ICD-10 autocomplete (M9)
  const [icdSearch, setIcdSearch] = useState('');
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);

  const ICD10_CODES = [
    { code: 'E11', name: 'Đái tháo đường type 2' },
    { code: 'E10', name: 'Đái tháo đường type 1' },
    { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
    { code: 'I11', name: 'Bệnh tim do tăng huyết áp' },
    { code: 'I25', name: 'Bệnh tim thiếu máu cục bộ mạn tính' },
    { code: 'I50', name: 'Suy tim' },
    { code: 'I63', name: 'Nhồi máu não' },
    { code: 'J06', name: 'Nhiễm khuẩn hô hấp trên cấp' },
    { code: 'J18', name: 'Viêm phổi' },
    { code: 'J44', name: 'Bệnh phổi tắc nghẽn mạn tính (COPD)' },
    { code: 'J45', name: 'Hen phế quản' },
    { code: 'K21', name: 'Trào ngược dạ dày-thực quản (GERD)' },
    { code: 'K25', name: 'Loét dạ dày' },
    { code: 'K26', name: 'Loét tá tràng' },
    { code: 'K29', name: 'Viêm dạ dày và tá tràng' },
    { code: 'K35', name: 'Viêm ruột thừa cấp' },
    { code: 'K76', name: 'Bệnh gan nhiễm mỡ' },
    { code: 'K80', name: 'Sỏi mật' },
    { code: 'M54', name: 'Đau lưng' },
    { code: 'M17', name: 'Thoái hoá khớp gối' },
    { code: 'M79', name: 'Đau cơ xương khớp' },
    { code: 'N18', name: 'Bệnh thận mạn tính' },
    { code: 'N39', name: 'Nhiễm trùng tiết niệu' },
    { code: 'E78', name: 'Rối loạn chuyển hoá lipoprotein (mỡ máu)' },
    { code: 'E03', name: 'Suy giáp' },
    { code: 'E05', name: 'Cường giáp' },
    { code: 'G43', name: 'Đau nửa đầu (Migraine)' },
    { code: 'G47', name: 'Rối loạn giấc ngủ' },
    { code: 'F32', name: 'Rối loạn trầm cảm' },
    { code: 'F41', name: 'Rối loạn lo âu' },
    { code: 'D50', name: 'Thiếu máu thiếu sắt' },
    { code: 'B34', name: 'Nhiễm virus không xác định' },
    { code: 'A09', name: 'Tiêu chảy nhiễm trùng' },
    { code: 'A15', name: 'Lao phổi' },
    { code: 'B18', name: 'Viêm gan virus mạn tính' },
    { code: 'L20', name: 'Viêm da cơ địa (chàm)' },
    { code: 'L50', name: 'Mề đay' },
    { code: 'H10', name: 'Viêm kết mạc' },
    { code: 'H66', name: 'Viêm tai giữa' },
    { code: 'J02', name: 'Viêm họng cấp' },
    { code: 'J03', name: 'Viêm amidan cấp' },
    { code: 'J20', name: 'Viêm phế quản cấp' },
    { code: 'R50', name: 'Sốt không rõ nguyên nhân' },
    { code: 'R51', name: 'Đau đầu' },
    { code: 'R10', name: 'Đau bụng' },
    { code: 'R05', name: 'Ho' },
    { code: 'E66', name: 'Béo phì' },
    { code: 'E55', name: 'Thiếu vitamin D' },
    { code: 'I48', name: 'Rung nhĩ' },
    { code: 'N40', name: 'Phì đại tuyến tiền liệt' },
  ];

  const filteredICD = ICD10_CODES.filter(item =>
    icdSearch.length === 0 ? true :
    item.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
    item.name.toLowerCase().includes(icdSearch.toLowerCase())
  );

  // Dấu hiệu sinh tồn
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    spO2: '',
    bloodSugar: '',
  });
  const updateVital = (key: string, val: string) => setVitals(p => ({ ...p, [key]: val }));

  // Drug interactions state
  const [interactions, setInteractions] = useState<{ safe: boolean; summary: string; interactions: DrugInteraction[] } | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Re-prescribe (M4)
  const [searchParams] = useSearchParams();
  const represcribeId = searchParams.get('represcribe');
  const [isReprescribe, setIsReprescribe] = useState(false);
  const [represcribeDate, setReprescribeDate] = useState('');

  function newRow(id: number): PrescriptionRow {
    return {
      id,
      name: '',
      dosage: '',
      frequency: 'DAILY',
      sessions: [],
      mealTiming: 'AFTER_MEAL',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: '',
    };
  }

  const sessionConfig = [
    { key: 'MORNING', label: 'Sáng', hint: '6–9h', icon: Sun, color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'NOON', label: 'Trưa', hint: '10–13h', icon: CloudSun, color: '#F97316', bg: '#FFF7ED' },
    { key: 'EVENING', label: 'Tối', hint: '17–21h', icon: Moon, color: '#6366F1', bg: '#EEF2FF' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchPatientInfo();
    if (represcribeId) fetchReprescribeData(represcribeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, represcribeId]);

  const fetchPatientInfo = async () => {
    try {
      const res = await axios.get(`https://smartcare-uqgi.onrender.com/api/doctors/patients/${patientId}/profile`);
      setPatientInfo(res.data.patient);
    } catch { /* silent */ }
  };

  // M4: fetch old MedicalRecord and pre-fill form
  const fetchReprescribeData = async (recordId: string) => {
    try {
      const res = await axios.get(`https://smartcare-uqgi.onrender.com/api/medical-records/${patientId}/${recordId}`);
      const rec = res.data.record;
      if (!rec) return;

      setIsReprescribe(true);
      setReprescribeDate(new Date(rec.createdAt).toLocaleDateString('vi-VN'));

      // Pre-fill diagnosis
      setDiagnosis(rec.diagnosis || '');
      setIcdCode(rec.icdCode || '');
      setVisitNote(rec.note || '');

      // Pre-fill symptoms
      if (rec.symptoms?.length) {
        setSymptoms(rec.symptoms.map((s: any) => ({
          symptomName: s.name || s.symptomName || '',
          severity: s.severity || 5,
        })));
      }

      // Pre-fill vitals
      if (rec.vitalSigns) {
        const vs = rec.vitalSigns;
        setVitals({
          bloodPressure: vs.bloodPressure || '',
          heartRate: vs.heartRate?.toString() || '',
          temperature: vs.temperature?.toString() || '',
          weight: vs.weight?.toString() || '',
          spO2: vs.spO2?.toString() || '',
          bloodSugar: vs.bloodSugar?.toString() || '',
        });
      }

      // Pre-fill prescriptions
      if (rec.prescriptionIds?.length) {
        const prefilled: PrescriptionRow[] = rec.prescriptionIds.map((med: any, idx: number) => ({
          id: idx + 1,
          name: med.name || '',
          dosage: med.dosage || '',
          frequency: med.frequency || 'DAILY',
          sessions: med.sessions || [],
          mealTiming: med.mealTiming || 'AFTER_MEAL',
          startDate: new Date().toISOString().split('T')[0], // reset to today
          endDate: '',
          notes: med.notes || '',
        }));
        setRows(prefilled);
      }
    } catch {
      // silent fallback — just open empty form
    }
  };

  // A – Tìm trong Danh Mục Thuốc + gợi ý AI (debounced)
  const handleNameChange = (idx: number, val: string) => {
    updateRow(idx, 'name', val);
    if (val.length < 2) {
      setCatalogResults([]); setShowCatalog(false);
      setSuggestions([]); setShowSuggestions(false);
      return;
    }

    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    suggestDebounce.current = setTimeout(async () => {
      // 1. Tìm catalog trước (nhanh, ưu tiên)
      setCatalogLoading(true); setShowCatalog(true);
      try {
        const catRes = await axios.get('https://smartcare-uqgi.onrender.com/api/drug-catalog/search', { params: { q: val } });
        setCatalogResults(catRes.data.drugs || []);
      } catch { setCatalogResults([]); }
      finally { setCatalogLoading(false); }
    }, 300);
  };

  // Áp dụng thuốc từ Danh Mục Thuốc
  const applyCatalogDrug = (drug: any, idx: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      name: drug.name,
      dosage: drug.defaultDosage || r.dosage,
      sessions: drug.defaultSessions?.length ? drug.defaultSessions : r.sessions,
      mealTiming: drug.defaultMealTiming || r.mealTiming,
    } : r));
    setCatalogResults([]); setShowCatalog(false);
    setTimeout(() => {
      setRows(current => {
        const drugs = current.map(r => r.name).filter(Boolean);
        if (drugs.length >= 2) runInteractionCheck(drugs);
        return current;
      });
    }, 200);
  };


  // Add / remove symptom entries
  const addSymptom = () => {
    if (!symptomInput.trim()) return;
    setSymptoms(prev => [...prev, { symptomName: symptomInput.trim(), severity: symptomSeverity }]);
    setSymptomInput('');
    setSymptomSeverity(5);
  };
  const removeSymptom = (idx: number) => setSymptoms(prev => prev.filter((_, i) => i !== idx));

  const symColor = (v: number) => v <= 3 ? '#10B981' : v <= 6 ? '#F59E0B' : '#EF4444';
  const symLabel = (v: number) => v <= 3 ? 'Nhẹ' : v <= 6 ? 'Vừa' : 'Nặng';

  // Fill suggestion into a new prescription row (or fill first empty row)
  const applySuggestion = (s: DrugSuggestion) => {
    setRows(prev => {
      const firstEmpty = prev.findIndex(r => !r.name.trim());
      const builtRow: PrescriptionRow = {
        id: firstEmpty >= 0 ? prev[firstEmpty].id : prev.length + 1,
        name: s.name,
        dosage: s.dosage,
        frequency: 'DAILY',
        sessions: s.sessions,
        mealTiming: s.mealTiming,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: s.notes,
      };
      if (firstEmpty >= 0) {
        // Fill first empty slot
        return prev.map((r, i) => i === firstEmpty ? builtRow : r);
      }
      // Append new row
      return [...prev, builtRow];
    });
    setSuggestions([]);
    setShowSuggestions(false);
    // Auto-check interactions with updated names
    setTimeout(() => {
      setRows(current => {
        const drugs = current.map(r => r.name).filter(Boolean);
        if (drugs.length >= 2) runInteractionCheck(drugs);
        return current;
      });
    }, 200);
  };

  // B – Kiểm tra tương tác thuốc
  const runInteractionCheck = async (drugNames?: string[]) => {
    const drugs = (drugNames || rows.map(r => r.name)).filter(n => n.trim().length > 0);
    if (drugs.length < 2) { setInteractions(null); return; }
    setInteractionLoading(true);
    try {
      const res = await axios.post('https://smartcare-uqgi.onrender.com/api/ai/medication/interactions', { drugs });
      setInteractions(res.data);
    } catch { setInteractions(null); }
    finally { setInteractionLoading(false); }
  };

  // Row helpers
  const updateRow = (idx: number, field: keyof PrescriptionRow, val: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };
  const toggleSession = (idx: number, session: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      sessions: r.sessions.includes(session) ? r.sessions.filter(s => s !== session) : [...r.sessions, session]
    } : r));
  };
  const addRow = () => setRows(prev => [...prev, newRow(prev.length + 1)]);
  const removeRow = (idx: number) => { if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== idx)); };

  // Submit: tạo MedicalRecord (bao gồm đơn thuốc)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) { alert('Vui lòng nhập Chẩn đoán trước khi phát hành đơn!'); return; }
    const filledRows = rows.filter(r => r.name.trim());
    if (filledRows.length === 0) { alert('Vui lòng nhập ít nhất 1 thuốc!'); return; }
    for (const row of filledRows) {
      if (row.sessions.length === 0) { alert(`Thuốc "${row.name}" chưa chọn buổi uống!`); return; }
    }
    setSubmitting(true);
    try {
      await axios.post(`https://smartcare-uqgi.onrender.com/api/medical-records/${patientId}`, {
        diagnosis: diagnosis.trim(),
        icdCode: icdCode.trim(),
        note: visitNote.trim(),
        followUpDate: followUpDate || null,
        symptoms: symptoms.map(s => ({ name: s.symptomName, severity: s.severity, notes: '' })),
        vitalSigns: {
          bloodPressure: vitals.bloodPressure  || undefined,
          heartRate:     vitals.heartRate      ? Number(vitals.heartRate)  : undefined,
          temperature:   vitals.temperature    ? Number(vitals.temperature): undefined,
          weight:        vitals.weight         ? Number(vitals.weight)     : undefined,
          spO2:          vitals.spO2           ? Number(vitals.spO2)       : undefined,
          bloodSugar:    vitals.bloodSugar     ? Number(vitals.bloodSugar) : undefined,
        },
        prescriptions: filledRows.map(row => ({
          name:      row.name,
          dosage:    row.dosage,
          frequency: row.frequency,
          sessions:  row.sessions,
          mealTiming: row.mealTiming,
          startDate: new Date(row.startDate).toISOString(),
          endDate:   row.endDate ? new Date(row.endDate).toISOString() : null,
          notes:     row.notes,
        })),
      });
      alert(`Đã lưu hồ sơ khám + ${filledRows.length} đơn thuốc cho bệnh nhân!`);
      navigate(`/patients/${patientId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gửi thất bại');
    } finally { setSubmitting(false); }
  };

  const severityColor = (sev: string) => ({ MILD: '#F59E0B', MODERATE: '#F97316', SEVERE: '#DC2626' }[sev] || '#6B7280');
  const severityLabel = (sev: string) => ({ MILD: 'Nhẹ', MODERATE: 'Trung bình', SEVERE: 'Nghiêm trọng' }[sev] || sev);

  return (
    <div style={{ backgroundColor: '#F1F5F9', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .scroll-col::-webkit-scrollbar { width: 6px; }
        .scroll-col::-webkit-scrollbar-track { background: transparent; }
        .scroll-col::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .scroll-col::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        .scroll-col { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
      `}</style>

      {/* Navbar */}
      <nav style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate(`/patients/${patientId}`)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '500' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <ArrowLeft size={18} /> Về Hồ Sơ Bệnh Nhân
          </button>
          {patientInfo && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>Kê đơn cho: {patientInfo.name}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>{patientInfo.medicalCondition || 'Chưa có chẩn đoán'}</div>
            </div>
          )}
          <div style={{ width: 160 }} />
        </div>
      </nav>

      {/* Re-prescribe Banner (M4) */}
      {isReprescribe && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.5rem 2rem 0' }}>
          <div style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: 'white', padding: '0.9rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            <RefreshCw size={20} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={15} /> Tái kê đơn từ hồ sơ khám ngày {represcribeDate}</div>
              <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>Dữ liệu đã được điền sẵn — bạn có thể chỉnh sửa trước khi phát hành đơn mới.</div>
            </div>
          </div>
        </div>
      )}

      <main style={{ padding: '0 2rem', maxWidth: '1100px', margin: '0 auto', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        <form onSubmit={handleSubmit} style={{ height: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start', height: '100%' }}>

            {/* ===== CỘT TRÁI: Danh sách thuốc ===== */}
            <div style={{ overflowY: 'auto', height: '100%', paddingRight: '8px', paddingTop: '1.5rem', paddingBottom: '2rem' }} className="scroll-col">
              {rows.map((row, idx) => (
                <div key={row.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', position: 'relative' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                        <Pill size={22} color="#2563EB" />
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1E293B' }}>
                        Thuốc #{idx + 1}
                      </span>
                    </div>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(idx)} style={{ background: '#FEE2E2', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#DC2626', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={14} /> Xoá
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    {/* Tên thuốc với Catalog + AI Suggest */}
                    <div style={{ gridColumn: 'span 2', position: 'relative' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                        Tên thuốc (Biệt dược)
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#059669', backgroundColor: '#F0FDF4', padding: '2px 8px', borderRadius: '999px' }}>📦 Tìm từ Danh Mục Thuốc</span>
                      </label>
                      <input required value={row.name}
                        onChange={e => handleNameChange(idx, e.target.value)}
                        onBlur={() => setTimeout(() => { setShowCatalog(false); setShowSuggestions(false); }, 200)}
                        onFocus={() => { if (catalogResults.length > 0) setShowCatalog(true); }}
                        placeholder="Gõ tên thuốc để tìm trong danh mục..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s' }}
                        onFocusCapture={e => e.target.style.border = '1.5px solid #059669'}
                        onBlurCapture={e => e.target.style.border = '1.5px solid #E2E8F0'}
                      />
                      {/* Catalog Dropdown – ưu tiên hàng đầu */}
                      {showCatalog && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #D1FAE5', zIndex: 100, marginTop: '6px', animation: 'fadeIn 0.15s ease', maxHeight: '300px', overflowY: 'auto' }}>
                          <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '700', color: '#059669', backgroundColor: '#F0FDF4', borderBottom: '1px solid #D1FAE5', borderRadius: '12px 12px 0 0' }}>
                            📦 Danh Mục Thuốc Phòng Khám
                          </div>
                          {catalogLoading ? (
                            <div style={{ padding: '1.25rem', textAlign: 'center', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang tìm...
                            </div>
                          ) : catalogResults.length === 0 ? (
                            <div style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', color: '#9CA3AF', textAlign: 'center' }}>
                              Không có trong danh mục — dùng AI gợi ý bên phải
                            </div>
                          ) : catalogResults.map((drug: any, di: number) => (
                            <div key={di} onClick={() => applyCatalogDrug(drug, idx)}
                              style={{ padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: di < catalogResults.length - 1 ? '1px solid #F0FDF4' : 'none', transition: 'background 0.15s' }}
                              onMouseOver={e => e.currentTarget.style.backgroundColor = '#F0FDF4'}
                              onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                              <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Pill size={14} color="#1E40AF" /> {drug.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                                {drug.activeIngredient && <span>🧪 {drug.activeIngredient} · </span>}
                                {drug.defaultDosage} · {(drug.defaultSessions || []).map((s: string) => ({ MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' }[s] || s)).join('/')}
                              </div>
                              {drug.stock < 50 && <div style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}><AlertTriangle size={12} /> Tồn kho thấp: {drug.stock} {drug.unit}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                    </div>

                    {/* Liều lượng */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Liều lượng</label>
                      <input required value={row.dosage} onChange={e => updateRow(idx, 'dosage', e.target.value)}
                        placeholder="VD: 1 viên/lần"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.95rem', outline: 'none' }} />
                    </div>

                    {/* Tần suất */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Tần suất</label>
                      <select value={row.frequency} onChange={e => updateRow(idx, 'frequency', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.95rem', outline: 'none', backgroundColor: '#fff' }}>
                        <option value="DAILY">Uống mỗi ngày</option>
                        <option value="EVERY_OTHER_DAY">Uống cách ngày</option>
                      </select>
                    </div>

                    {/* Buổi uống */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Buổi uống <span style={{ color: '#EF4444' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        {sessionConfig.map(s => {
                          const active = row.sessions.includes(s.key);
                          const Icon = s.icon;
                          return (
                            <button type="button" key={s.key} onClick={() => toggleSession(idx, s.key)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '1rem', borderRadius: '12px', cursor: 'pointer', border: active ? `2px solid ${s.color}` : '2px solid #E2E8F0', backgroundColor: active ? s.bg : '#FAFAFA', transition: 'all 0.2s', boxShadow: active ? `0 4px 10px ${s.color}30` : 'none' }}>
                              <Icon size={24} color={active ? s.color : '#9CA3AF'} />
                              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: active ? s.color : '#6B7280' }}>{s.label}</span>
                              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{s.hint}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hình thức uống */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Hình thức uống</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                          { key: 'BEFORE_MEAL', label: 'Trước ăn 30 phút' },
                          { key: 'AFTER_MEAL', label: 'Sau khi ăn no' },
                        ].map(opt => {
                          const active = row.mealTiming === opt.key;
                          return (
                            <button type="button" key={opt.key} onClick={() => updateRow(idx, 'mealTiming', opt.key)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.9rem 1rem', borderRadius: '10px', cursor: 'pointer', border: active ? '2px solid #2563EB' : '2px solid #E2E8F0', backgroundColor: active ? '#EFF6FF' : '#FAFAFA', transition: 'all 0.2s' }}>
                              {opt.key === 'BEFORE_MEAL' ? <Utensils size={22} color={active ? '#2563EB' : '#6B7280'} /> : <CheckCircle size={22} color={active ? '#2563EB' : '#6B7280'} />}
                              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: active ? '#2563EB' : '#6B7280' }}>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ngày */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Ngày bắt đầu</label>
                      <input type="date" required value={row.startDate} onChange={e => updateRow(idx, 'startDate', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.95rem', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Ngày kết thúc (tuỳ chọn)</label>
                      <input type="date" value={row.endDate} onChange={e => updateRow(idx, 'endDate', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.95rem', outline: 'none' }} />
                    </div>

                    {/* Lời dặn */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Lời dặn của Bác sĩ</label>
                      <textarea value={row.notes} onChange={e => updateRow(idx, 'notes', e.target.value)} rows={3}
                        placeholder="VD: Uống sau ăn no. Nếu có dị ứng vui lòng liên hệ ngay."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add drug button */}
              <button type="button" onClick={addRow}
                style={{ width: '100%', padding: '1rem', border: '2px dashed #CBD5E1', borderRadius: '12px', backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                + Thêm thuốc khác vào đơn
              </button>

              {/* Submit */}
              <button type="submit" disabled={submitting}
                style={{ width: '100%', padding: '1.25rem', background: 'linear-gradient(135deg, #059669, #10B981)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.1rem', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.4)', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s' }}
                onMouseOver={e => !submitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu hồ sơ...</> : <><Send size={16} /> Hoàn tất Khám — Phát Hành Đơn Thuốc</>}
              </button>
            </div>

            {/* ===== CỘT PHẢI: AI Panel ===== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', height: '100%', paddingLeft: '4px', paddingTop: '1.5rem', paddingBottom: '2rem' }} className="scroll-col">

              {/* ===== PANEL CHẨN ĐOÁN (bắt buộc) ===== */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '2px solid #BFDBFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '8px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', borderRadius: '10px' }}>
                    <Stethoscope size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B' }}>Chẩn đoán <span style={{ color: '#DC2626' }}>*</span></div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Bắt buộc — lưu vào hồ sơ khám</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Chẩn đoán chính *</label>
                    <input
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      placeholder="VD: Đái tháo đường type 2, tăng huyết áp..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 1rem', borderRadius: '10px', border: diagnosis.trim() ? '1.5px solid #3B82F6' : '1.5px solid #FECACA', fontSize: '0.9rem', outline: 'none', backgroundColor: '#F8FAFF' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Mã ICD-10 (tùy chọn)
                        {icdCode && <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: '#059669', backgroundColor: '#F0FDF4', padding: '2px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CheckCircle size={12} /> {icdCode}</span>}
                      </label>
                      <input
                        value={icdSearch}
                        onChange={e => { setIcdSearch(e.target.value); setShowIcdDropdown(true); }}
                        onFocus={() => setShowIcdDropdown(true)}
                        onBlur={() => setTimeout(() => setShowIcdDropdown(false), 200)}
                        placeholder={icdCode ? `${icdCode} — ${ICD10_CODES.find(i => i.code === icdCode)?.name || ''}` : 'Gõ mã hoặc tên bệnh...'}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '8px', border: icdCode ? '1.5px solid #059669' : '1.5px solid #E2E8F0', fontSize: '0.88rem', outline: 'none', backgroundColor: icdCode ? '#F0FDF4' : '#fff' }}
                      />
                      {icdCode && (
                        <button type="button" onClick={() => { setIcdCode(''); setIcdSearch(''); }}
                          style={{ position: 'absolute', right: '8px', top: '34px', background: '#FEE2E2', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', color: '#DC2626', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                          ×
                        </button>
                      )}
                      {showIcdDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #DBEAFE', zIndex: 100, marginTop: '4px', maxHeight: '240px', overflowY: 'auto', animation: 'fadeIn 0.15s ease' }}>
                          <div style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: '700', color: '#1D4ED8', backgroundColor: '#EFF6FF', borderBottom: '1px solid #DBEAFE', borderRadius: '10px 10px 0 0', position: 'sticky', top: 0 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Building2 size={13} color="#1D4ED8" /> ICD-10 — {filteredICD.length} mã</span>
                          </div>
                          {filteredICD.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#9CA3AF' }}>Không tìm thấy mã phù hợp</div>
                          ) : filteredICD.map(item => (
                            <div key={item.code}
                              onMouseDown={(e) => { e.preventDefault(); setIcdCode(item.code); setIcdSearch(''); setShowIcdDropdown(false); }}
                              style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', transition: 'background 0.1s', display: 'flex', alignItems: 'center', gap: '10px' }}
                              onMouseOver={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                              onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                              <span style={{ fontWeight: '800', color: '#1E40AF', fontSize: '0.85rem', minWidth: '38px', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '6px', textAlign: 'center' }}>{item.code}</span>
                              <span style={{ fontSize: '0.84rem', color: '#374151' }}>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Tái khám (tùy chọn)</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={e => setFollowUpDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '0.88rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Ghi chú của bác sĩ (tùy chọn)</label>
                    <textarea
                      value={visitNote}
                      onChange={e => setVisitNote(e.target.value)}
                      rows={2}
                      placeholder="Lưu ý đặc biệt, tiến triển bệnh..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '0.88rem', outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* ===== PANEL TRIỆU CHỨNG ===== */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '8px', background: 'linear-gradient(135deg, #DC2626, #F87171)', borderRadius: '10px' }}>
                    <Thermometer size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B' }}>Triệu chứng hiện tại</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>AI dùng để gợi ý thuốc chính xác hơn</div>
                  </div>
                </div>

                {/* Input row */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    value={symptomInput}
                    onChange={e => setSymptomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSymptom())}
                    placeholder="VD: Đau đầu, chóng mặt, sốt..."
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem' }}
                    onFocusCapture={e => e.target.style.border = '1.5px solid #DC2626'}
                    onBlurCapture={e => e.target.style.border = '1.5px solid #E2E8F0'}
                  />
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Mức độ: <span style={{ color: symColor(symptomSeverity) }}>{symptomSeverity}/10 – {symLabel(symptomSeverity)}</span></label>
                    </div>
                    <input type="range" min={1} max={10} value={symptomSeverity}
                      onChange={e => setSymptomSeverity(Number(e.target.value))}
                      style={{ width: '100%', accentColor: symColor(symptomSeverity), cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>
                      <span>1 – Nhẹ</span><span>5 – Vừa</span><span>10 – Nặng</span>
                    </div>
                  </div>
                  <button type="button" onClick={addSymptom}
                    style={{ width: '100%', padding: '0.7rem', background: symptomInput.trim() ? 'linear-gradient(135deg, #DC2626, #F87171)' : '#E5E7EB', color: symptomInput.trim() ? 'white' : '#9CA3AF', border: 'none', borderRadius: '10px', cursor: symptomInput.trim() ? 'pointer' : 'not-allowed', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Plus size={16} /> Thêm Triệu Chứng
                  </button>
                </div>

                {/* Symptom tags */}
                {symptoms.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {symptoms.map((s, si) => (
                      <div key={si} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', borderRadius: '8px', backgroundColor: `${symColor(s.severity)}12`, border: `1px solid ${symColor(s.severity)}30` }}>
                        <div>
                          <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.88rem' }}>{s.symptomName}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.78rem', fontWeight: '600', color: symColor(s.severity), backgroundColor: `${symColor(s.severity)}20`, padding: '1px 7px', borderRadius: '999px' }}>{s.severity}/10 {symLabel(s.severity)}</span>
                        </div>
                        <button type="button" onClick={() => removeSymptom(si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px', display: 'flex' }}>
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {symptoms.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0 0', fontStyle: 'italic' }}>Chưa có triệu chứng nào. AI sẽ chỉ dựa trên chẩn đoán.</p>
                )}
              </div>

              {/* ===== PANEL DẤU HIỆU SINH TỔN (optional) ===== */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '8px', background: 'linear-gradient(135deg, #0891B2, #06B6D4)', borderRadius: '10px' }}>
                    <Heart size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B' }}>Dấu hiệu sinh tồn</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Tùy chọn — lưu vào hồ sơ khám</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { key: 'bloodPressure', label: 'Huyết áp', placeholder: '120/80', icon: '🪀', unit: 'mmHg' },
                    { key: 'heartRate',     label: 'Nhịp tim',    placeholder: '75',    icon: '❤️',   unit: 'bpm' },
                    { key: 'temperature',   label: 'Nhiệt độ',   placeholder: '37.0',  icon: '🌡️',  unit: '°C' },
                    { key: 'weight',        label: 'Cân nặng',    placeholder: '65',    icon: '⚖️',  unit: 'kg' },
                    { key: 'spO2',          label: 'SpO₂',        placeholder: '98',    icon: '💧',  unit: '%' },
                    { key: 'bloodSugar',    label: 'Đường huyết',  placeholder: '5.5',   icon: '🩸',  unit: 'mmol/L' },
                  ].map(v => (
                    <div key={v.key}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>{v.icon} {v.label} <span style={{ color: '#9CA3AF', fontWeight: '400' }}>({v.unit})</span></label>
                      <input
                        type={v.key === 'bloodPressure' ? 'text' : 'number'}
                        step="any"
                        value={(vitals as any)[v.key]}
                        onChange={e => updateVital(v.key, e.target.value)}
                        placeholder={v.placeholder}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '0.88rem', outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Suggest trigger */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                  <div style={{ padding: '8px', background: 'linear-gradient(135deg, #7C3AED, #A855F7)', borderRadius: '10px' }}>
                    <Sparkles size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B' }}>Gợi ý AI Thông minh</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Dựa trên chẩn đoán {symptoms.length > 0 ? `+ ${symptoms.length} triệu chứng` : ''}</div>
                  </div>
                  {showSuggestions && (
                    <button type="button" onClick={() => { setShowSuggestions(false); setSuggestions([]); }}
                      style={{ background: '#F3F4F6', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem', color: '#6B7280' }}>
                      × Đóng
                    </button>
                  )}
                </div>
                <button type="button" disabled={suggestLoading} onClick={async () => {
                  setSuggestLoading(true);
                  setSuggestions([]);
                  setShowSuggestions(true);   // mở panel ngay lập tức
                  try {
                    const res = await axios.post('https://smartcare-uqgi.onrender.com/api/ai/medication/suggest', {
                      medicalCondition: patientInfo?.medicalCondition || '',
                      symptoms,
                      partialDrugName: rows[0]?.name || '',
                    });
                    setSuggestions(res.data.suggestions || []);
                  } catch (err: any) {
                    // lưu error dưới dạng sentinel item
                    setSuggestions([{ name: '__error__', reason: err.response?.data?.error || 'Không kết nối được AI. Kiểm tra OPENAI_API_KEY.', dosage: '', sessions: [], mealTiming: '', notes: '' }]);
                  } finally {
                    setSuggestLoading(false);
                  }
                }}
                  style={{ width: '100%', padding: '0.8rem', background: suggestLoading ? '#E5E7EB' : 'linear-gradient(135deg, #7C3AED, #A855F7)', color: suggestLoading ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', cursor: suggestLoading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {suggestLoading
                    ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang phân tích...</>
                    : <><Sparkles size={16} /> Gợi ý thuốc từ Chẩn đoán</>}
                </button>

                {/* Kết quả gợi ý */}
                {showSuggestions && (
                  <div style={{ marginTop: '1rem', animation: 'fadeIn 0.2s ease' }}>
                    {suggestLoading ? (
                      <div style={{ padding: '1.25rem', textAlign: 'center', color: '#7C3AED', fontSize: '0.9rem' }}>
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> AI đang phân tích chẩn đoán...
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px dashed #D1D5DB' }}>
                        <div style={{ fontSize: '0.88rem', color: '#6B7280' }}>Không có gợi ý. Thử nhập chẩn đoán hoặc triệu chứng.</div>
                      </div>
                    ) : suggestions[0]?.name === '__error__' ? (
                      <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                        <div style={{ fontWeight: '600', color: '#DC2626', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Không thể kết nối AI</div>
                        <div style={{ fontSize: '0.8rem', color: '#991B1B' }}>{suggestions[0].reason}</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#7C3AED', marginBottom: '2px' }}>
                          ✨ {suggestions.length} gợi ý — nhấn để thêm vào đơn
                        </div>
                        {suggestions.map((s, si) => (
                          <div key={si} onClick={() => applySuggestion(s)}
                            style={{ padding: '0.9rem 1rem', border: '1.5px solid #EDE9FE', borderRadius: '10px', cursor: 'pointer', backgroundColor: '#FAFAFA', transition: 'all 0.2s' }}
                            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F5F3FF'; e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FAFAFA'; e.currentTarget.style.borderColor = '#EDE9FE'; e.currentTarget.style.transform = 'translateX(0)'; }}>
                            <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.9rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Pill size={14} color="#1E40AF" /> {s.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <span>📏 {s.dosage}</span>
                              <span>🕐 {(s.sessions || []).map((ss: string) => ({ MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' }[ss] || ss)).join('/')}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>{s.mealTiming === 'BEFORE_MEAL' ? <><Utensils size={12} /> Trước ăn</> : <><CheckCircle size={12} /> Sau ăn</>}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginTop: '6px', fontStyle: 'italic', borderTop: '1px solid #EDE9FE', paddingTop: '5px' }}>
                              💡 {s.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drug Interaction Panel */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                  <div style={{ padding: '8px', background: 'linear-gradient(135deg, #F97316, #EF4444)', borderRadius: '10px' }}>
                    <AlertTriangle size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B' }}>Kiểm tra Tương tác Thuốc</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Phân tích giữa các thuốc trong đơn</div>
                  </div>
                </div>

                <button type="button" onClick={() => runInteractionCheck()}
                  disabled={interactionLoading || rows.filter(r => r.name.trim()).length < 2}
                  style={{ width: '100%', padding: '0.8rem', background: rows.filter(r => r.name.trim()).length >= 2 ? 'linear-gradient(135deg, #F97316, #EF4444)' : '#E5E7EB', color: rows.filter(r => r.name.trim()).length >= 2 ? 'white' : '#9CA3AF', border: 'none', borderRadius: '10px', cursor: rows.filter(r => r.name.trim()).length >= 2 ? 'pointer' : 'not-allowed', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {interactionLoading ? <><Loader size={16} /> Đang kiểm tra...</> : <><AlertTriangle size={16} /> Kiểm tra tương tác</>}
                </button>
                {rows.filter(r => r.name.trim()).length < 2 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#9CA3AF', marginTop: '8px', margin: '8px 0 0 0' }}>Cần ≥ 2 thuốc để kiểm tra</p>
                )}

                {/* Interaction Results */}
                {interactions && (
                  <div style={{ marginTop: '1rem', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1rem', borderRadius: '10px', backgroundColor: interactions.safe ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${interactions.safe ? '#BBF7D0' : '#FECACA'}`, marginBottom: '12px' }}>
                      {interactions.safe
                        ? <CheckCircle size={18} color="#16A34A" />
                        : <AlertTriangle size={18} color="#DC2626" />}
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: interactions.safe ? '#166534' : '#991B1B' }}>{interactions.summary}</span>
                    </div>
                    {interactions.interactions.map((inter, ii) => (
                      <div key={ii} style={{ padding: '1rem', border: `1.5px solid ${severityColor(inter.severity)}30`, borderRadius: '10px', backgroundColor: `${severityColor(inter.severity)}08`, marginBottom: '8px', borderLeft: `4px solid ${severityColor(inter.severity)}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: severityColor(inter.severity), backgroundColor: `${severityColor(inter.severity)}20`, padding: '2px 8px', borderRadius: '999px' }}>
                            {severityLabel(inter.severity)}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>{inter.drugs.join(' + ')}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280', marginBottom: '4px' }}>{inter.description}</p>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: severityColor(inter.severity), fontWeight: '500' }}>→ {inter.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Thông tin bệnh nhân reference */}
              {patientInfo && (
                <div style={{ backgroundColor: '#1E3A8A', borderRadius: '16px', padding: '1.5rem', color: 'white' }}>
                  <div style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thông tin bệnh nhân</div>
                  {[
                    ['Chẩn đoán', patientInfo.medicalCondition || 'Chưa xác định'],
                    ['Chiều cao', patientInfo.height ? `${patientInfo.height} cm` : '---'],
                    ['Cân nặng', patientInfo.weight ? `${patientInfo.weight} kg` : '---'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>{label}</span>
                      <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
