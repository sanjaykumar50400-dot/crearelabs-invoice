import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

type Invoice = { id: string; title: string; services: any[]; subtotal: number; gst: number; gstAmount: number; total: number; notes?: string; status: string; clientFilled: boolean; discountAmount?: number; finalTotal?: number };

export default function Pay() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [inv, setInv] = useState<Invoice | null>(null);
  const [step, setStep] = useState<'form' | 'pay' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(true);

  // Form fields
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [gst, setGst] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [dcLoading, setDcLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Payment state
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const UPI_ID = 'crearelabs@ptaxis';

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStep('error'); }
        else {
          setInv(data);
          if (data.clientFilled) {
            setPayInvoice(data);
            setStep('pay');
            loadQR(data.finalTotal ?? data.total, data.title);
          }
        }
        setLoading(false);
      }).catch(() => { setStep('error'); setLoading(false); });
  }, [id]);

  async function loadQR(amount: number, note: string) {
    try {
      const r = await fetch(`/api/qr?amount=${amount}&note=${encodeURIComponent(note)}`);
      const d = await r.json();
      setQrUrl(d.qr);
    } catch (e) { console.error('QR failed', e); }
  }

  async function applyDiscount() {
    if (!discountCode.trim() || !inv) return;
    setDcLoading(true);
    setDiscountInfo(null);
    const r = await fetch(`/api/discounts?code=${encodeURIComponent(discountCode)}&invoiceId=${inv.id}`);
    const d = await r.json();
    setDiscountInfo(d);
    setDcLoading(false);
  }

  async function submitForm() {
    if (!fname || !lname || !email || !phone) { setFormError('Please fill all required fields.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setFormError('Please enter a valid email.'); return; }
    setFormError('');
    setSubmitLoading(true);
    const r = await fetch('/api/client-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: id, firstName: fname, lastName: lname, email, phone, company, gst, discountCode: discountInfo?.valid ? discountCode : '' }),
    });
    const data = await r.json();
    setSubmitLoading(false);
    if (data.success) {
      setPayInvoice(data.invoice);
      await loadQR(data.finalTotal, inv!.title);
      setStep('pay');
    } else { setFormError(data.error || 'Something went wrong. Try again.'); }
  }

  const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const previewSubtotal = inv?.subtotal ?? 0;
  const previewGST = inv?.gstAmount ?? 0;
  const previewTotal = inv?.total ?? 0;
  const previewFinal = discountInfo?.valid ? Math.max(0, previewTotal - (discountInfo.discountAmount ?? 0)) : previewTotal;

  function getUPILinks(amount: number, note: string) {
    const pa = encodeURIComponent(UPI_ID);
    const pn = encodeURIComponent('Crearelabs');
    const am = amount;
    const tn = encodeURIComponent(note);
    const base = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
    return [
      { name: 'Google Pay', emoji: '🟢', url: `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}` },
      { name: 'PhonePe', emoji: '🟣', url: `phonepe://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}` },
      { name: 'Paytm', emoji: '🔵', url: `paytmmp://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}` },
      { name: 'BHIM', emoji: '🟠', url: `bhim://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}` },
      { name: 'Amazon Pay', emoji: '🟡', url: base },
      { name: 'Any UPI App', emoji: '📱', url: base },
    ];
  }

  async function markPaid() {
    await fetch('/api/invoices', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'paid' }) });
    setStep('success');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#7A7870' }}>Loading invoice…</div>
    </div>
  );

  const finalAmt = payInvoice?.finalTotal ?? payInvoice?.total ?? 0;

  return (
    <>
      <Head>
        <title>Crearelabs — Invoice Payment</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="pay-wrap">
        {/* ERROR */}
        {step === 'error' && (
          <div className="pay-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>❌</div>
            <h2>Invoice Not Found</h2>
            <p style={{ color: '#7A7870', fontSize: 14, marginTop: '.5rem' }}>This link may be invalid or expired. Contact Crearelabs.</p>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && inv && (
          <div className="pay-card">
            <div className="pay-header">
              <div className="pay-logo">CL</div>
              <div className="pay-brand">Crearelabs</div>
              <div className="pay-tagline">Fill your details to continue to payment</div>
            </div>

            {/* Invoice Summary */}
            <div className="inv-summary">
              <div className="sum-title">{inv.title}</div>
              {inv.services.map((s: any) => (
                <div key={s.id} className="sum-row"><span>{s.name}</span><span>{INR(s.amount)}</span></div>
              ))}
              <div className="sum-row muted"><span>Subtotal</span><span>{INR(previewSubtotal)}</span></div>
              <div className="sum-row muted"><span>GST (18%)</span><span>+ {INR(previewGST)}</span></div>
              {discountInfo?.valid && <div className="sum-row green"><span>Discount ({discountCode.toUpperCase()})</span><span>− {INR(discountInfo.discountAmount)}</span></div>}
              <div className="sum-row bold"><span>Total Payable</span><span>{INR(previewFinal)}</span></div>
            </div>

            {/* Discount Code */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label>Discount Code (if any)</label>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <input value={discountCode} onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountInfo(null); }} placeholder="e.g. LAUNCH20" style={{ marginBottom: 0, flex: 1 }} />
                <button className="btn btn-sm btn-outline" onClick={applyDiscount} disabled={dcLoading}>{dcLoading ? '…' : 'Apply'}</button>
              </div>
              {discountInfo && (
                <div className={`alert ${discountInfo.valid ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '.5rem' }}>
                  {discountInfo.valid ? `✓ ${discountInfo.label} applied! Saving ${INR(discountInfo.discountAmount)}` : discountInfo.message}
                </div>
              )}
            </div>

            <div className="divider" />

            {/* Client Form */}
            <div className="form-grid">
              <div><label>First Name *</label><input value={fname} onChange={e => setFname(e.target.value)} placeholder="Ravi" /></div>
              <div><label>Last Name *</label><input value={lname} onChange={e => setLname(e.target.value)} placeholder="Sharma" /></div>
            </div>
            <label>Email Address *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ravi@example.com" />
            <label>Phone Number *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" />
            <label>Company / Organisation (optional)</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ABC Pvt. Ltd." />
            <label>GST Number (optional)</label>
            <input value={gst} onChange={e => setGst(e.target.value)} placeholder="22AAAAA0000A1Z5" />

            {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
            <button className="btn" onClick={submitForm} disabled={submitLoading} style={{ width: '100%' }}>
              {submitLoading ? 'Processing…' : 'Continue to Payment →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#7A7870', marginTop: '.75rem' }}>An invoice will be sent to your email</p>
          </div>
        )}

        {/* PAYMENT */}
        {step === 'pay' && payInvoice && (
          <div className="pay-card">
            <div className="pay-header">
              <div className="pay-logo">CL</div>
              <div className="pay-brand">Crearelabs</div>
              <div className="pay-tagline">Complete your payment</div>
            </div>

            <div className="inv-summary">
              <div className="sum-title">{payInvoice.title}</div>
              {payInvoice.services?.map((s: any) => <div key={s.id} className="sum-row"><span>{s.name}</span><span>{INR(s.amount)}</span></div>)}
              <div className="sum-row muted"><span>Subtotal</span><span>{INR(payInvoice.subtotal)}</span></div>
              <div className="sum-row muted"><span>GST (18%)</span><span>+ {INR(payInvoice.gstAmount)}</span></div>
              {(payInvoice.discountAmount ?? 0) > 0 && <div className="sum-row green"><span>Discount ({payInvoice.discountCode})</span><span>− {INR(payInvoice.discountAmount)}</span></div>}
              <div className="sum-row bold"><span>Total Payable</span><span>{INR(finalAmt)}</span></div>
            </div>

            <div className="section-label">Pay via UPI</div>
            <div className="upi-grid">
              {getUPILinks(finalAmt, payInvoice.title).map(app => (
                <a key={app.name} href={app.url} className="upi-btn">
                  <span className="upi-icon">{app.emoji}</span>
                  {app.name}
                </a>
              ))}
            </div>

            {!isMobile && qrUrl && (
              <div className="qr-section">
                <div className="section-label">Scan & Pay — Amount pre-filled</div>
                <div className="qr-wrap">
                  <img src={qrUrl} alt="UPI QR Code" width={200} height={200} />
                </div>
                <div className="upi-id-box">UPI ID: <strong>crearelabs@ptaxis</strong></div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={markPaid}>
                ✓ I have completed the payment
              </button>
            </div>
            {payInvoice.notes && <div className="notes-box"><strong>Note:</strong> {payInvoice.notes}</div>}
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="pay-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: '.5rem' }}>Payment Noted!</h2>
            <p style={{ color: '#7A7870', fontSize: 14, marginBottom: '2rem' }}>Thank you! Crearelabs will verify and send your receipt shortly.</p>
            <div className="notes-box" style={{ textAlign: 'center' }}>Questions? <strong>sanjaykumar50400@gmail.com</strong> | +91 9540117458</div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#F7F6F2;color:#1A1917;min-height:100vh;}
        .pay-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem;}
        .pay-card{background:#fff;border:1px solid #E8E5DC;border-radius:20px;padding:2.5rem 2rem;width:100%;max-width:520px;}
        .pay-header{text-align:center;margin-bottom:1.75rem;}
        .pay-logo{width:54px;height:54px;background:#1A1917;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Syne',sans-serif;font-weight:800;font-size:18px;margin:0 auto .75rem;}
        .pay-brand{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;}
        .pay-tagline{font-size:13px;color:#7A7870;margin-top:3px;}
        .inv-summary{background:#F7F6F2;border-radius:14px;padding:1.25rem;margin-bottom:1.5rem;}
        .sum-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:.75rem;color:#1A1917;}
        .sum-row{display:flex;justify-content:space-between;font-size:14px;padding:.3rem 0;}
        .sum-row.muted{color:#7A7870;font-size:13px;}
        .sum-row.bold{font-weight:700;font-size:15px;border-top:1px solid #E8E5DC;padding-top:.6rem;margin-top:.3rem;}
        .sum-row.green{color:#16A34A;}
        label{font-size:13px;font-weight:500;margin-bottom:.4rem;display:block;color:#7A7870;}
        input,select,textarea{width:100%;padding:.7rem 1rem;border:1px solid #E8E5DC;border-radius:10px;font-size:14px;background:#fff;color:#1A1917;outline:none;margin-bottom:1rem;font-family:'DM Sans',sans-serif;transition:.15s;}
        input:focus,select:focus{border-color:#1A1917;box-shadow:0 0 0 3px rgba(26,25,23,0.08);}
        .btn{padding:.8rem 1.25rem;background:#1A1917;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:.15s;}
        .btn:hover{opacity:.88}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .btn-sm{padding:.45rem .9rem;font-size:13px;border-radius:8px;}
        .btn-outline{background:transparent;color:#1A1917;border:1.5px solid #E8E5DC;}
        .btn-outline:hover{background:#F0EDE6;}
        .divider{border:none;border-top:1px solid #E8E5DC;margin:1.25rem 0;}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:0;}
        .alert{padding:.75rem 1rem;border-radius:10px;font-size:13px;}
        .alert-success{background:#D1FAE5;color:#065F46;}
        .alert-error{background:#FEE2E2;color:#991B1B;}
        .section-label{font-size:11px;font-weight:500;color:#7A7870;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:.75rem;}
        .upi-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.5rem;}
        .upi-btn{padding:.9rem .5rem;border:1.5px solid #E8E5DC;border-radius:12px;background:#fff;cursor:pointer;font-size:13px;font-weight:500;text-align:center;transition:.15s;color:#1A1917;display:block;text-decoration:none;}
        .upi-btn:hover{border-color:#1A1917;background:#F7F6F2;}
        .upi-icon{font-size:22px;margin-bottom:.3rem;display:block;}
        .qr-section{text-align:center;border-top:1px solid #E8E5DC;padding-top:1.5rem;margin-top:0;}
        .qr-wrap{display:inline-block;padding:12px;border:1px solid #E8E5DC;border-radius:14px;background:#fff;margin:.75rem 0;}
        .upi-id-box{background:#F0EDE6;border-radius:10px;padding:.6rem 1rem;font-size:14px;font-weight:500;color:#7A7870;display:inline-block;margin:0 auto;}
        .upi-id-box strong{color:#1A1917;}
        .notes-box{background:#F7F6F2;border-radius:10px;padding:.75rem 1rem;font-size:13px;color:#7A7870;margin-top:1rem;}
        h2{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;}
        @media(max-width:480px){.form-grid{grid-template-columns:1fr;}.upi-grid{grid-template-columns:1fr 1fr;}}
      `}</style>
    </>
  );
}
