import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

type Service = { id: string; name: string; amount: number; desc?: string };
type DiscountCode = { id: string; code: string; type: 'percent' | 'flat'; value: number; used: boolean; createdAt: number; usedBy?: string };
type Invoice = { id: string; title: string; services: any[]; subtotal: number; gst: number; gstAmount: number; total: number; notes?: string; status: string; created: number; clientFilled: boolean; clientName?: string; clientEmail?: string; clientPhone?: string; clientCompany?: string; clientGST?: string; discountCode?: string; discountAmount?: number; finalTotal?: number; emailSent?: boolean };

export default function Admin() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [section, setSection] = useState<'invoices' | 'services' | 'discounts' | 'clients'>('invoices');
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);

  // Modals
  const [showSvcModal, setShowSvcModal] = useState(false);
  const [showInvModal, setShowInvModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showInvDetail, setShowInvDetail] = useState(false);
  const [showDiscModal, setShowDiscModal] = useState(false);

  // Service form
  const [editSvcId, setEditSvcId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcAmt, setSvcAmt] = useState('');
  const [svcDesc, setSvcDesc] = useState('');

  // Invoice form
  const [invTitle, setInvTitle] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [selServices, setSelServices] = useState<any[]>([]);
  const [selSvcId, setSelSvcId] = useState('');
  const [customSvcName, setCustomSvcName] = useState('');
  const [customSvcAmt, setCustomSvcAmt] = useState('');

  // Discount form
  const [dcCode, setDcCode] = useState('');
  const [dcType, setDcType] = useState<'percent' | 'flat'>('percent');
  const [dcValue, setDcValue] = useState('');

  // Detail
  const [detailInv, setDetailInv] = useState<Invoice | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('cl_token') || '';
    if (!t) { router.push('/'); return; }
    fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify-token', token: t }) })
      .then(r => r.json()).then(d => { if (!d.valid) router.push('/'); else { setToken(t); loadAll(); } });
  }, []);

  async function loadAll() {
    const [svcs, invs, dcs] = await Promise.all([
      fetch('/api/services').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/discounts').then(r => r.json()),
    ]);
    setServices(svcs);
    setInvoices(invs);
    setDiscounts(dcs);
    if (svcs.length) setSelSvcId(svcs[0].id);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function logout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', token }) });
    localStorage.removeItem('cl_token');
    router.push('/');
  }

  // -- SERVICES --
  async function saveService() {
    if (!svcName || !svcAmt) return;
    const body = editSvcId ? { id: editSvcId, name: svcName, amount: svcAmt, desc: svcDesc } : { name: svcName, amount: svcAmt, desc: svcDesc };
    await fetch('/api/services', { method: editSvcId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowSvcModal(false); setSvcName(''); setSvcAmt(''); setSvcDesc(''); setEditSvcId(null);
    loadAll();
  }
  async function deleteService(id: string) {
    if (!confirm('Delete this service?')) return;
    await fetch('/api/services', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadAll();
  }
  function editService(s: Service) { setEditSvcId(s.id); setSvcName(s.name); setSvcAmt(String(s.amount)); setSvcDesc(s.desc || ''); setShowSvcModal(true); }

  // -- INVOICE --
  function addServiceToInvoice() {
    const svc = services.find(s => s.id === selSvcId);
    if (!svc) return;
    setSelServices(prev => [...prev, { id: Date.now().toString(), name: svc.name, amount: svc.amount }]);
  }
  function addCustomService() {
    if (!customSvcName || !customSvcAmt) return;
    setSelServices(prev => [...prev, { id: Date.now().toString(), name: customSvcName, amount: Number(customSvcAmt) }]);
    setCustomSvcName(''); setCustomSvcAmt('');
  }
  function removeSel(id: string) { setSelServices(prev => prev.filter(s => s.id !== id)); }

  const subtotal = selServices.reduce((a, s) => a + Number(s.amount), 0);
  const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + gstAmount;

  async function createInvoice() {
    if (!invTitle || !selServices.length) return;
    setLoading(true);
    const r = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: invTitle, services: selServices, notes: invNotes }) });
    const inv = await r.json();
    setLoading(false);
    setShowInvModal(false);
    setInvTitle(''); setInvNotes(''); setSelServices([]);
    const link = `${window.location.origin}/pay/${inv.id}`;
    setGeneratedLink(link);
    setShowLinkModal(true);
    loadAll();
  }

  async function resendEmail(id: string) {
    const r = await fetch('/api/resend-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const d = await r.json();
    if (d.success) { showToast('Invoice emailed ✓'); loadAll(); }
    else showToast('Email failed: ' + d.error);
  }

  async function markPaid(id: string) {
    await fetch('/api/invoices', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'paid' }) });
    setShowInvDetail(false); setDetailInv(null); loadAll();
    showToast('Invoice marked as paid ✓');
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch('/api/invoices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setShowInvDetail(false); setDetailInv(null); loadAll();
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    showToast('Link copied!');
  }

  // -- DISCOUNTS --
  async function createDiscount() {
    if (!dcCode || !dcValue) return;
    await fetch('/api/discounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: dcCode, type: dcType, value: dcValue }) });
    setDcCode(''); setDcValue(''); setDcType('percent');
    setShowDiscModal(false); loadAll();
    showToast('Discount code created ✓');
  }
  async function deleteDiscount(id: string) {
    if (!confirm('Delete this discount code?')) return;
    await fetch('/api/discounts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadAll();
  }

  // Stats
  const paid = invoices.filter(i => i.status === 'paid').length;
  const pending = invoices.filter(i => i.status !== 'paid').length;
  const revenue = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + (i.finalTotal ?? i.total), 0);

  const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <>
      <Head><title>Crearelabs — Admin Dashboard</title><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" /></Head>
      <div className="admin-wrap">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="brand-logo">CL</div>
            <div>
              <div className="brand-name">Crearelabs</div>
              <div className="brand-sub">Admin Dashboard</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn btn-sm" onClick={() => { setSelServices([]); setInvTitle(''); setInvNotes(''); setShowInvModal(true); }}>+ New Invoice</button>
            <button className="logout-btn" onClick={logout}>Logout</button>
            <div className="avatar">SJ</div>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          {[
            { label: 'Total Invoices', val: invoices.length, cls: '' },
            { label: 'Paid', val: paid, cls: 'green' },
            { label: 'Pending', val: pending, cls: 'amber' },
            { label: 'Revenue', val: INR(revenue), cls: 'green' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className={`stat-val ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* NAV */}
        <div className="nav-tabs">
          {(['invoices', 'services', 'discounts', 'clients'] as const).map(t => (
            <button key={t} className={`nav-tab${section === t ? ' active' : ''}`} onClick={() => setSection(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* INVOICES */}
        {section === 'invoices' && (
          <div>
            {invoices.length === 0 && <div className="panel"><div className="empty">No invoices yet. Create your first invoice above.</div></div>}
            {[...invoices].reverse().map(inv => (
              <div key={inv.id} className="inv-row panel" onClick={() => { setDetailInv(inv); setShowInvDetail(true); }}>
                <div className="inv-info">
                  <div className="inv-title">{inv.title}</div>
                  <div className="inv-meta">
                    {inv.clientName || 'Awaiting client'} &nbsp;•&nbsp; {new Date(inv.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {inv.emailSent && <span style={{ marginLeft: '.5rem', color: '#16A34A' }}>✉ sent</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="inv-amt">{INR(inv.finalTotal ?? inv.total)}</div>
                  <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SERVICES */}
        {section === 'services' && (
          <div className="panel">
            <div className="panel-title">
              <span>Services & Rates</span>
              <button className="btn btn-sm" onClick={() => { setEditSvcId(null); setSvcName(''); setSvcAmt(''); setSvcDesc(''); setShowSvcModal(true); }}>+ Add</button>
            </div>
            {services.length === 0 && <div className="empty">No services yet.</div>}
            {services.map(s => (
              <div key={s.id} className="service-row">
                <div style={{ flex: 1 }}>
                  <div className="svc-name">{s.name}</div>
                  {s.desc && <div className="svc-desc">{s.desc}</div>}
                </div>
                <div className="svc-amt">{INR(s.amount)}</div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => editService(s)}>✏️</button>
                  <button className="icon-btn" onClick={() => deleteService(s.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DISCOUNTS */}
        {section === 'discounts' && (
          <div className="panel">
            <div className="panel-title">
              <span>Discount Codes</span>
              <button className="btn btn-sm" onClick={() => setShowDiscModal(true)}>+ Generate Code</button>
            </div>
            {discounts.length === 0 && <div className="empty">No discount codes yet.</div>}
            {discounts.map(dc => (
              <div key={dc.id} className="service-row">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <code className="code-pill">{dc.code}</code>
                    <span className={`badge ${dc.used ? 'badge-paid' : 'badge-sent'}`}>{dc.used ? 'Used' : 'Active'}</span>
                  </div>
                  <div className="svc-desc">
                    {dc.type === 'percent' ? `${dc.value}% off` : `₹${dc.value} flat off`}
                    {dc.used && dc.usedBy && ` — used by ${dc.usedBy}`}
                  </div>
                </div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => deleteDiscount(dc.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLIENTS */}
        {section === 'clients' && (
          <div>
            {invoices.filter(i => i.clientFilled).length === 0 && <div className="panel"><div className="empty">No client data yet. Clients fill their details via invoice links.</div></div>}
            {invoices.filter(i => i.clientFilled).reverse().map(inv => (
              <div key={inv.id} className="panel" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, borderRadius: '50%', flexShrink: 0 }}>{(inv.clientName || '?').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{inv.clientName}</div>
                    <div className="svc-desc">{inv.clientEmail}{inv.clientPhone ? ` • ${inv.clientPhone}` : ''}</div>
                    {inv.clientCompany && <div className="svc-desc">{inv.clientCompany}</div>}
                    {inv.clientGST && <div className="svc-desc" style={{ fontFamily: 'monospace' }}>GST: {inv.clientGST}</div>}
                  </div>
                  <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                </div>
                <div style={{ marginTop: '.75rem', fontSize: 13, color: '#7A7870' }}>Invoice: <strong style={{ color: '#1A1917' }}>{inv.title}</strong> — {INR(inv.finalTotal ?? inv.total)}</div>
              </div>
            ))}
          </div>
        )}

        {/* TOAST */}
        {toast && <div className="toast">{toast}</div>}

        {/* SERVICE MODAL */}
        {showSvcModal && (
          <div className="overlay" onClick={() => setShowSvcModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editSvcId ? 'Edit Service' : 'Add Service'}</div>
              <label>Service Name</label>
              <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="e.g. Website Design" />
              <label>Amount (₹)</label>
              <input type="number" value={svcAmt} onChange={e => setSvcAmt(e.target.value)} placeholder="e.g. 25000" />
              <div className="gst-preview">{svcAmt && !isNaN(Number(svcAmt)) ? `+18% GST = ₹${(Number(svcAmt) * 0.18).toFixed(2)} → Total ₹${(Number(svcAmt) * 1.18).toFixed(2)}` : 'GST (18%) will be added automatically'}</div>
              <label>Description (optional)</label>
              <textarea value={svcDesc} onChange={e => setSvcDesc(e.target.value)} placeholder="Short description" rows={2} />
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowSvcModal(false)}>Cancel</button>
                <button className="btn" onClick={saveService}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE MODAL */}
        {showInvModal && (
          <div className="overlay" onClick={() => setShowInvModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Create Invoice</div>
              <label>Invoice Title</label>
              <input value={invTitle} onChange={e => setInvTitle(e.target.value)} placeholder="e.g. Website Redesign — Phase 1" />
              <label>Add Services</label>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
                <select value={selSvcId} onChange={e => setSelSvcId(e.target.value)} style={{ flex: 1, marginBottom: 0 }}>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} — {INR(s.amount)}</option>)}
                </select>
                <button className="btn btn-sm btn-outline" onClick={addServiceToInvoice}>Add</button>
              </div>
              <label>Custom Line Item</label>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
                <input value={customSvcName} onChange={e => setCustomSvcName(e.target.value)} placeholder="Custom item" style={{ flex: 1, marginBottom: 0 }} />
                <input type="number" value={customSvcAmt} onChange={e => setCustomSvcAmt(e.target.value)} placeholder="₹ amount" style={{ width: 110, marginBottom: 0 }} />
                <button className="btn btn-sm btn-outline" onClick={addCustomService}>Add</button>
              </div>
              {selServices.length > 0 && (
                <div className="sel-services">
                  {selServices.map(s => (
                    <div key={s.id} className="sel-chip">{s.name} — {INR(s.amount)} <span className="rm" onClick={() => removeSel(s.id)}>×</span></div>
                  ))}
                </div>
              )}
              <div className="totals-box">
                <div className="total-row"><span>Subtotal</span><span>{INR(subtotal)}</span></div>
                <div className="total-row muted"><span>GST (18%)</span><span>+ {INR(gstAmount)}</span></div>
                <div className="total-row bold"><span>Total Payable</span><span>{INR(total)}</span></div>
              </div>
              <label>Notes for Client (optional)</label>
              <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="Payment terms, project scope, deadline..." rows={2} />
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowInvModal(false)}>Cancel</button>
                <button className="btn" onClick={createInvoice} disabled={loading}>{loading ? 'Creating…' : 'Generate Link'}</button>
              </div>
            </div>
          </div>
        )}

        {/* LINK MODAL */}
        {showLinkModal && (
          <div className="overlay" onClick={() => setShowLinkModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Invoice Link Ready 🎉</div>
              <p style={{ fontSize: 14, color: '#7A7870', marginBottom: '1.25rem' }}>Share this with your client. They'll fill their details and then pay via UPI.</p>
              <label>Client Payment Link</label>
              <div className="link-box">
                <span className="link-text-small">{generatedLink}</span>
                <button className="copy-btn" onClick={() => copyLink(generatedLink)}>{copied ? '✓ Copied!' : 'Copy'}</button>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowLinkModal(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE DETAIL MODAL */}
        {showInvDetail && detailInv && (
          <div className="overlay" onClick={() => { setShowInvDetail(false); setDetailInv(null); }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{detailInv.title}</div>
              <div className="inv-detail-box">
                {detailInv.services.map((s: any) => <div key={s.id} className="detail-row"><span>{s.name}</span><span>{INR(s.amount)}</span></div>)}
                <div className="detail-row muted"><span>Subtotal</span><span>{INR(detailInv.subtotal)}</span></div>
                <div className="detail-row muted"><span>GST 18%</span><span>+ {INR(detailInv.gstAmount)}</span></div>
                {(detailInv.discountAmount ?? 0) > 0 && <div className="detail-row green"><span>Discount ({detailInv.discountCode})</span><span>− {INR(detailInv.discountAmount!)}</span></div>}
                <div className="detail-row bold"><span>Total Payable</span><span>{INR(detailInv.finalTotal ?? detailInv.total)}</span></div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                <span className={`badge badge-${detailInv.status}`}>{detailInv.status}</span>
                {detailInv.status !== 'paid' && <button className="btn btn-sm" style={{ background: '#16A34A' }} onClick={() => markPaid(detailInv.id)}>Mark Paid</button>}
                {detailInv.clientFilled && <button className="btn btn-sm btn-outline" onClick={() => resendEmail(detailInv.id)}>✉ Resend Email</button>}
                <button className="btn btn-sm btn-outline" onClick={() => deleteInvoice(detailInv.id)}>Delete</button>
              </div>
              {detailInv.clientFilled ? (
                <div style={{ fontSize: 13, color: '#7A7870', marginBottom: '.75rem' }}>
                  <strong style={{ color: '#1A1917' }}>{detailInv.clientName}</strong> • {detailInv.clientEmail} {detailInv.clientPhone ? `• ${detailInv.clientPhone}` : ''}
                  {detailInv.clientCompany ? <div>{detailInv.clientCompany}</div> : null}
                </div>
              ) : <div style={{ fontSize: 13, color: '#D97706', marginBottom: '.75rem' }}>⏳ Awaiting client details</div>}
              <label>Client Link</label>
              <div className="link-box">
                <span className="link-text-small">{`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${detailInv.id}`}</span>
                <button className="copy-btn" onClick={() => copyLink(`${window.location.origin}/pay/${detailInv.id}`)}>Copy</button>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => { setShowInvDetail(false); setDetailInv(null); }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* DISCOUNT MODAL */}
        {showDiscModal && (
          <div className="overlay" onClick={() => setShowDiscModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Generate Discount Code</div>
              <label>Code (e.g. LAUNCH20)</label>
              <input value={dcCode} onChange={e => setDcCode(e.target.value.toUpperCase())} placeholder="LAUNCH20" />
              <label>Discount Type</label>
              <select value={dcType} onChange={e => setDcType(e.target.value as 'percent' | 'flat')}>
                <option value="percent">Percentage off (%)</option>
                <option value="flat">Flat amount off (₹)</option>
              </select>
              <label>{dcType === 'percent' ? 'Percentage (%)' : 'Amount (₹)'}</label>
              <input type="number" value={dcValue} onChange={e => setDcValue(e.target.value)} placeholder={dcType === 'percent' ? 'e.g. 20 for 20% off' : 'e.g. 500 for ₹500 off'} />
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowDiscModal(false)}>Cancel</button>
                <button className="btn" onClick={createDiscount}>Create Code</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#F7F6F2;color:#1A1917;min-height:100vh;}
        .admin-wrap{max-width:900px;margin:0 auto;padding:1.5rem;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;}
        .topbar-left,.topbar-right{display:flex;align-items:center;gap:.75rem;}
        .brand-logo{width:38px;height:38px;background:#1A1917;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;}
        .brand-name{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;}
        .brand-sub{font-size:11px;color:#7A7870;letter-spacing:0.06em;text-transform:uppercase;}
        .avatar{width:36px;height:36px;border-radius:50%;background:#1A1917;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;}
        .logout-btn{font-size:13px;color:#7A7870;cursor:pointer;padding:.4rem .8rem;border:1px solid #E8E5DC;border-radius:8px;background:none;font-family:'DM Sans',sans-serif;}
        .logout-btn:hover{background:#F0EDE6;}
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem;}
        .stat-card{background:#fff;border:1px solid #E8E5DC;border-radius:16px;padding:1.25rem;}
        .stat-label{font-size:11px;color:#7A7870;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:.4rem;}
        .stat-val{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;}
        .stat-val.green{color:#16A34A;}
        .stat-val.amber{color:#D97706;}
        .nav-tabs{display:flex;gap:0;margin-bottom:1.5rem;border-bottom:1px solid #E8E5DC;}
        .nav-tab{padding:.6rem 1rem;font-size:14px;font-weight:500;color:#7A7870;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s;font-family:'DM Sans',sans-serif;}
        .nav-tab.active{color:#1A1917;border-bottom-color:#1A1917;}
        .panel{background:#fff;border:1px solid #E8E5DC;border-radius:16px;padding:1.5rem;margin-bottom:1rem;}
        .panel-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;}
        .inv-row{cursor:pointer;transition:.1s;}
        .inv-row:hover{background:#FAFAF8;}
        .inv-row{display:flex;align-items:center;gap:1rem;background:#fff;border:1px solid #E8E5DC;border-radius:16px;padding:1.25rem;margin-bottom:1rem;}
        .inv-info{flex:1;min-width:0;}
        .inv-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;}
        .inv-meta{font-size:12px;color:#7A7870;margin-top:3px;}
        .inv-amt{font-weight:600;font-size:15px;margin-bottom:3px;}
        .service-row{display:flex;align-items:center;gap:.75rem;padding:.75rem 0;border-bottom:1px solid #E8E5DC;}
        .service-row:last-child{border-bottom:none;}
        .svc-name{font-size:14px;font-weight:500;}
        .svc-desc{font-size:12px;color:#7A7870;margin-top:2px;}
        .svc-amt{font-size:14px;font-weight:600;color:#16A34A;white-space:nowrap;}
        .row-actions{display:flex;gap:.3rem;}
        .icon-btn{border:none;background:#F0EDE6;border-radius:6px;width:30px;height:30px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;}
        .icon-btn:hover{background:#E8E5DC;}
        .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;}
        .badge-pending{background:#FEF3C7;color:#92400E;}
        .badge-paid{background:#D1FAE5;color:#065F46;}
        .badge-sent{background:#DBEAFE;color:#1E40AF;}
        .code-pill{background:#F0EDE6;border-radius:6px;padding:3px 8px;font-size:13px;letter-spacing:0.05em;}
        .empty{text-align:center;color:#7A7870;font-size:13px;padding:2rem 0;}
        .btn{padding:.75rem 1.25rem;background:#1A1917;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:.15s;}
        .btn:hover{opacity:.88}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .btn-sm{padding:.45rem .9rem;font-size:13px;border-radius:8px;}
        .btn-outline{background:transparent;color:#1A1917;border:1.5px solid #E8E5DC;}
        .btn-outline:hover{background:#F0EDE6;}
        label{font-size:13px;font-weight:500;margin-bottom:.4rem;display:block;color:#7A7870;}
        input,select,textarea{width:100%;padding:.7rem 1rem;border:1px solid #E8E5DC;border-radius:10px;font-size:14px;background:#fff;color:#1A1917;outline:none;margin-bottom:1rem;font-family:'DM Sans',sans-serif;transition:.15s;}
        input:focus,select:focus,textarea:focus{border-color:#1A1917;box-shadow:0 0 0 3px rgba(26,25,23,0.08);}
        .gst-preview{font-size:12px;color:#7A7870;background:#F0EDE6;border-radius:8px;padding:.5rem .75rem;margin-bottom:1rem;margin-top:-.5rem;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:100;padding:1rem;}
        .modal{background:#fff;border-radius:20px;padding:2rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;}
        .modal-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:1.25rem;}
        .modal-footer{display:flex;gap:.75rem;margin-top:1.25rem;}
        .modal-footer .btn{flex:1;}
        .sel-services{margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:.3rem;}
        .sel-chip{display:inline-flex;align-items:center;gap:.4rem;background:#F0EDE6;border-radius:6px;padding:.3rem .7rem;font-size:12px;font-weight:500;}
        .sel-chip .rm{cursor:pointer;color:#7A7870;font-size:15px;line-height:1;}
        .totals-box{background:#F7F6F2;border-radius:12px;padding:1rem;margin-bottom:1rem;}
        .total-row{display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;font-size:14px;}
        .total-row.muted{color:#7A7870;font-size:13px;}
        .total-row.bold{font-weight:700;font-size:15px;border-top:1px solid #E8E5DC;padding-top:.5rem;margin-top:.25rem;}
        .total-row.green{color:#16A34A;}
        .link-box{background:#F0EDE6;border-radius:10px;padding:.6rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.25rem;}
        .link-text-small{font-size:11px;font-family:monospace;color:#7A7870;word-break:break-all;}
        .copy-btn{background:#1A1917;color:#fff;border:none;border-radius:6px;padding:.3rem .6rem;font-size:11px;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;}
        .inv-detail-box{background:#F7F6F2;border-radius:12px;padding:1rem;margin-bottom:1rem;}
        .detail-row{display:flex;justify-content:space-between;padding:.3rem 0;font-size:14px;}
        .detail-row.muted{color:#7A7870;font-size:13px;}
        .detail-row.bold{font-weight:700;font-size:15px;border-top:1px solid #E8E5DC;padding-top:.5rem;margin-top:.25rem;}
        .detail-row.green{color:#16A34A;}
        .toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#1A1917;color:#fff;padding:.7rem 1.5rem;border-radius:10px;font-size:14px;font-weight:500;z-index:999;animation:fadeUp .2s ease;}
        @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @media(max-width:600px){.admin-wrap{padding:1rem;}.stats-grid{grid-template-columns:1fr 1fr;}}
      `}</style>
    </>
  );
}
