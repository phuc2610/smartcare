import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Package, ChevronDown, X, Save, Beaker, Utensils, CheckCircle } from 'lucide-react';

const API = 'http://localhost:4000/api/drug-catalog';

const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  ANALGESIC:        { label: 'Giảm đau / Hạ sốt',       color: '#F59E0B', bg: '#FFFBEB' },
  ANTIBIOTIC:       { label: 'Kháng sinh',               color: '#EF4444', bg: '#FEF2F2' },
  ANTIHYPERTENSIVE: { label: 'Hạ huyết áp',             color: '#3B82F6', bg: '#EFF6FF' },
  ANTIDIABETIC:     { label: 'Tiểu đường',              color: '#8B5CF6', bg: '#F5F3FF' },
  VITAMIN:          { label: 'Vitamin / Bổ sung',        color: '#10B981', bg: '#F0FDF4' },
  ANTIHISTAMINE:    { label: 'Dị ứng',                  color: '#F97316', bg: '#FFF7ED' },
  GASTRIC:          { label: 'Dạ dày / Tiêu hoá',       color: '#06B6D4', bg: '#ECFEFF' },
  CARDIOVASCULAR:   { label: 'Tim mạch',                color: '#EC4899', bg: '#FDF2F8' },
  OTHER:            { label: 'Khác',                    color: '#6B7280', bg: '#F9FAFB' },
};

const SESSION_LABEL: Record<string, string> = { MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' };

interface Drug {
  _id: string;
  name: string;
  activeIngredient: string;
  category: string;
  defaultDosage: string;
  defaultSessions: string[];
  defaultMealTiming: string;
  unit: string;
  price: number;
  stock: number;
  contraindications: string;
  sideEffects: string;
  notes: string;
  isActive: boolean;
}

const emptyForm = (): Partial<Drug> => ({
  name: '', activeIngredient: '', category: 'OTHER',
  defaultDosage: '1 viên/lần', defaultSessions: ['MORNING'],
  defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 0, stock: 0,
  contraindications: '', sideEffects: '', notes: '',
});

export default function DrugCatalog() {
  const navigate = useNavigate();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Modal state
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Drug>>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, []);

  const fetchDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, { params: { q, category: filterCat, limit: 50 } });
      setDrugs(res.data.drugs);
      setTotal(res.data.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [q, filterCat]);

  useEffect(() => { fetchDrugs(); }, [fetchDrugs]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await axios.post(`${API}/seed`);
      alert(res.data.message);
      fetchDrugs();
    } catch (err: any) { alert(err.response?.data?.error || 'Seed thất bại'); }
    finally { setSeeding(false); }
  };

  const openAdd = () => { setForm(emptyForm()); setModal('add'); };
  const openEdit = (d: Drug) => { setForm({ ...d }); setModal('edit'); };

  const handleSave = async () => {
    if (!form.name?.trim()) return alert('Vui lòng nhập tên thuốc');
    setSaving(true);
    try {
      if (modal === 'add') {
        await axios.post(API, form);
      } else {
        await axios.patch(`${API}/${(form as Drug)._id}`, form);
      }
      setModal(null);
      fetchDrugs();
    } catch (err: any) { alert(err.response?.data?.error || 'Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (d: Drug) => {
    if (!confirm(`Xoá thuốc "${d.name}" khỏi danh mục?`)) return;
    try {
      await axios.delete(`${API}/${d._id}`);
      fetchDrugs();
    } catch (err: any) { alert(err.response?.data?.error || 'Xoá thất bại'); }
  };

  const toggleSession = (s: string) => {
    setForm(prev => {
      const cur = prev.defaultSessions || [];
      return { ...prev, defaultSessions: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] };
    });
  };

  const catInfo = (key: string) => CATEGORIES[key] || CATEGORIES.OTHER;

  return (
    <div style={{ backgroundColor: '#F1F5F9', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}} @keyframes slideIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Navbar */}
      <nav style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '500' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <ArrowLeft size={16} /> Về Dashboard
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px' }}>
                <Package size={22} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>Danh Mục Thuốc</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>Quản lý thư viện thuốc nội bộ — {total} loại</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSeed} disabled={seeding}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', padding: '0.6rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: seeding ? 0.6 : 1 }}>
              <Beaker size={16} /> {seeding ? 'Đang seed...' : 'Seed mẫu'}
            </button>
            <button onClick={openAdd}
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.4)' }}>
              <Plus size={16} /> Thêm thuốc mới
            </button>
          </div>
        </div>
      </nav>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên thuốc, hoạt chất..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem 0.85rem 2.75rem', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ padding: '0.85rem 2.5rem 0.85rem 1rem', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', minWidth: '200px' }}>
              <option value="">Tất cả nhóm thuốc</option>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Category summary chips */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {Object.entries(CATEGORIES).map(([k, v]) => {
            const count = drugs.filter(d => d.category === k).length;
            if (count === 0 && !filterCat) return null;
            return (
              <button key={k} onClick={() => setFilterCat(filterCat === k ? '' : k)}
                style={{ padding: '4px 12px', borderRadius: '999px', border: `1.5px solid ${filterCat === k ? v.color : '#E2E8F0'}`, backgroundColor: filterCat === k ? v.bg : 'white', color: filterCat === k ? v.color : '#6B7280', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>
                {v.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Drug table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>Đang tải...</div>
        ) : drugs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9CA3AF' }}>
            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Danh mục trống</p>
            <p style={{ fontSize: '0.9rem' }}>Nhấn "Seed mẫu" để thêm dữ liệu demo, hoặc "Thêm thuốc mới" để bắt đầu.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {drugs.map(drug => {
              const cat = catInfo(drug.category);
              return (
                <div key={drug._id} style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center', animation: 'fadeIn 0.15s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    {/* Tên + Nhóm */}
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B', marginBottom: '3px' }}>{drug.name}</div>
                      {drug.activeIngredient && <div style={{ fontSize: '0.82rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Beaker size={13} /> {drug.activeIngredient}</div>}
                      <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.75rem', fontWeight: '600', color: cat.color, backgroundColor: cat.bg, padding: '2px 8px', borderRadius: '999px' }}>{cat.label}</span>
                    </div>
                    {/* Liều mặc định */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Liều mặc định</div>
                      <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#374151' }}>{drug.defaultDosage}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{(drug.defaultSessions || []).map(s => SESSION_LABEL[s]).join(' · ')}</div>
                    </div>
                    {/* Hình thức */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Hình thức</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>{drug.defaultMealTiming === 'BEFORE_MEAL' ? <><Utensils size={14} /> Trước ăn</> : <><CheckCircle size={14} /> Sau ăn</>}</div>
                    </div>
                    {/* Giá */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Giá</div>
                      <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#374151' }}>{drug.price.toLocaleString('vi-VN')} đ/{drug.unit}</div>
                    </div>
                    {/* Tồn kho */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Tồn kho</div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: drug.stock < 50 ? '#EF4444' : '#10B981' }}>{drug.stock} {drug.unit}</div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEdit(drug)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#2563EB' }}
                      title="Chỉnh sửa">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(drug)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #FEE2E2', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#DC2626' }}
                      title="Xoá">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===== MODAL THÊM / SỬA ===== */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', animation: 'slideIn 0.2s ease' }}>
            {/* Modal header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', borderRadius: '20px 20px 0 0', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', borderRadius: '10px' }}>
                  <Package size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1E293B' }}>
                    {modal === 'add' ? 'Thêm thuốc mới' : `Chỉnh sửa: ${form.name}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Thông tin thuốc trong danh mục</div>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Tên thuốc */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Tên thuốc (Biệt dược) <span style={{ color: '#EF4444' }}>*</span></label>
                <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Paracetamol 500mg" style={inputStyle} />
              </div>
              {/* Hoạt chất */}
              <div>
                <label style={labelStyle}>Hoạt chất</label>
                <input value={form.activeIngredient || ''} onChange={e => setForm(p => ({ ...p, activeIngredient: e.target.value }))}
                  placeholder="VD: Paracetamol" style={inputStyle} />
              </div>
              {/* Nhóm */}
              <div>
                <label style={labelStyle}>Nhóm thuốc</label>
                <select value={form.category || 'OTHER'} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {/* Liều mặc định */}
              <div>
                <label style={labelStyle}>Liều mặc định</label>
                <input value={form.defaultDosage || ''} onChange={e => setForm(p => ({ ...p, defaultDosage: e.target.value }))}
                  placeholder="VD: 1 viên/lần" style={inputStyle} />
              </div>
              {/* Đơn vị */}
              <div>
                <label style={labelStyle}>Đơn vị</label>
                <input value={form.unit || ''} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="viên / gói / ml" style={inputStyle} />
              </div>
              {/* Buổi uống */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Buổi uống mặc định</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {['MORNING', 'NOON', 'EVENING'].map(s => {
                    const active = (form.defaultSessions || []).includes(s);
                    return (
                      <button type="button" key={s} onClick={() => toggleSession(s)}
                        style={{ padding: '8px 20px', borderRadius: '10px', border: active ? '2px solid #2563EB' : '2px solid #E2E8F0', backgroundColor: active ? '#EFF6FF' : '#FAFAFA', color: active ? '#2563EB' : '#6B7280', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {SESSION_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Hình thức */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Hình thức uống mặc định</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {[{ key: 'BEFORE_MEAL', label: 'Trước ăn 30 phút' }, { key: 'AFTER_MEAL', label: 'Sau khi ăn no' }].map(opt => {
                    const active = form.defaultMealTiming === opt.key;
                    return (
                      <button type="button" key={opt.key} onClick={() => setForm(p => ({ ...p, defaultMealTiming: opt.key }))}
                        style={{ padding: '8px 20px', borderRadius: '10px', border: active ? '2px solid #2563EB' : '2px solid #E2E8F0', backgroundColor: active ? '#EFF6FF' : '#FAFAFA', color: active ? '#2563EB' : '#6B7280', fontWeight: '600', cursor: 'pointer' }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Giá */}
              <div>
                <label style={labelStyle}>Giá / đơn vị (VNĐ)</label>
                <input type="number" value={form.price || 0} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} style={inputStyle} />
              </div>
              {/* Tồn kho */}
              <div>
                <label style={labelStyle}>Tồn kho (số lượng)</label>
                <input type="number" value={form.stock || 0} onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) }))} style={inputStyle} />
              </div>
              {/* Chống chỉ định */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Chống chỉ định</label>
                <textarea value={form.contraindications || ''} onChange={e => setForm(p => ({ ...p, contraindications: e.target.value }))}
                  rows={2} placeholder="VD: Không dùng cho người dị ứng Penicillin..."
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {/* Tác dụng phụ */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Tác dụng phụ thường gặp</label>
                <textarea value={form.sideEffects || ''} onChange={e => setForm(p => ({ ...p, sideEffects: e.target.value }))}
                  rows={2} placeholder="VD: Buồn nôn, tiêu chảy (ít gặp)..."
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {/* Ghi chú */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Ghi chú thêm</label>
                <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setModal(null)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', backgroundColor: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>
                Huỷ
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '0.75rem 1.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: 'white', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}>
                <Save size={16} /> {saving ? 'Đang lưu...' : modal === 'add' ? 'Thêm vào danh mục' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' };
