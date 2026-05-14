import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState<'otp' | 'pwd'>('otp');
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
  const [demoOtp, setDemoOtp] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'info' | 'success' } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('cl_token');
    if (token) {
      fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify-token', token }) })
        .then(r => r.json()).then(d => { if (d.valid) router.push('/admin'); });
    }
  }, []);

  async function sendOTP() {
    setLoading(true);
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send-otp' }) });
    const d = await r.json();
    setDemoOtp(d.demoOtp);
    setOtpStep('verify');
    setMsg({ text: `OTP sent! Demo OTP: ${d.demoOtp} (integrate SMS API to deliver via SMS)`, type: 'info' });
    setLoading(false);
  }

  async function verifyOTP() {
    setLoading(true);
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify-otp', otp: otpVal }) });
    const d = await r.json();
    if (d.token) { localStorage.setItem('cl_token', d.token); router.push('/admin'); }
    else { setMsg({ text: 'Invalid OTP. Try again.', type: 'error' }); }
    setLoading(false);
  }

  async function loginPassword() {
    setLoading(true);
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'password', password }) });
    const d = await r.json();
    if (d.token) { localStorage.setItem('cl_token', d.token); router.push('/admin'); }
    else { setMsg({ text: 'Incorrect password.', type: 'error' }); }
    setLoading(false);
  }

  return (
    <>
      <Head><title>Crearelabs — Admin Login</title><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" /></Head>
      <div className="login-wrap">
        <div className="login-card">
          <div className="brand">
            <div className="brand-logo">CL</div>
            <div>
              <div className="brand-name">Crearelabs</div>
              <div className="brand-sub">Invoice System</div>
            </div>
          </div>
          <h2>Admin Login</h2>
          <p className="sub">Secure access — Crearelabs team only</p>
          <div className="tabs">
            <button className={`tab${tab === 'otp' ? ' active' : ''}`} onClick={() => setTab('otp')}>Phone OTP</button>
            <button className={`tab${tab === 'pwd' ? ' active' : ''}`} onClick={() => setTab('pwd')}>Password</button>
          </div>
          {tab === 'otp' && (
            <>
              {otpStep === 'send' && (
                <>
                  <label>Registered Phone</label>
                  <input value="+91 9540117458" readOnly style={{ background: '#F0EDE6', color: '#7A7870' }} />
                  <button className="btn" onClick={sendOTP} disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
                </>
              )}
              {otpStep === 'verify' && (
                <>
                  <label>Enter OTP</label>
                  <input placeholder="6-digit OTP" value={otpVal} onChange={e => setOtpVal(e.target.value)} maxLength={6} />
                  <button className="btn" onClick={verifyOTP} disabled={loading}>{loading ? 'Verifying…' : 'Verify & Login'}</button>
                  <div style={{ textAlign: 'center', marginTop: '.75rem' }}>
                    <span className="link-text" onClick={() => { setOtpStep('send'); setMsg(null); setOtpVal(''); }}>← Resend OTP</span>
                  </div>
                </>
              )}
            </>
          )}
          {tab === 'pwd' && (
            <>
              <label>Password</label>
              <input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginPassword()} />
              <button className="btn" onClick={loginPassword} disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
            </>
          )}
          {msg && <div className={`alert alert-${msg.type}`} style={{ marginTop: '1rem' }}>{msg.text}</div>}
        </div>

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'DM Sans',sans-serif;background:#F7F6F2;color:#1A1917;min-height:100vh;}
          .login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem;}
          .login-card{background:#fff;border:1px solid #E8E5DC;border-radius:20px;padding:2.5rem 2rem;width:100%;max-width:420px;}
          .brand{display:flex;align-items:center;gap:10px;margin-bottom:2rem;}
          .brand-logo{width:42px;height:42px;background:#1A1917;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Syne',sans-serif;font-weight:800;font-size:14px;}
          .brand-name{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;}
          .brand-sub{font-size:11px;color:#7A7870;letter-spacing:0.06em;text-transform:uppercase;margin-top:1px;}
          h2{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:.3rem;}
          .sub{color:#7A7870;font-size:14px;margin-bottom:1.5rem;}
          .tabs{display:flex;background:#F0EDE6;border-radius:10px;padding:3px;margin-bottom:1.5rem;gap:2px;}
          .tab{flex:1;padding:.5rem;border:none;background:transparent;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:#7A7870;transition:.15s;font-family:'DM Sans',sans-serif;}
          .tab.active{background:#fff;color:#1A1917;box-shadow:0 1px 3px rgba(0,0,0,0.08);}
          label{font-size:13px;font-weight:500;margin-bottom:.4rem;display:block;color:#7A7870;}
          input,select,textarea{width:100%;padding:.7rem 1rem;border:1px solid #E8E5DC;border-radius:10px;font-size:14px;background:#fff;color:#1A1917;outline:none;margin-bottom:1rem;font-family:'DM Sans',sans-serif;transition:.15s;}
          input:focus,select:focus,textarea:focus{border-color:#1A1917;box-shadow:0 0 0 3px rgba(26,25,23,0.08);}
          .btn{width:100%;padding:.8rem;background:#1A1917;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;transition:.15s;font-family:'DM Sans',sans-serif;}
          .btn:hover{opacity:.88}
          .btn:disabled{opacity:.5;cursor:not-allowed;}
          .link-text{font-size:13px;color:#7A7870;cursor:pointer;}
          .link-text:hover{color:#1A1917;}
          .alert{padding:.75rem 1rem;border-radius:10px;font-size:13px;}
          .alert-success{background:#D1FAE5;color:#065F46;}
          .alert-error{background:#FEE2E2;color:#991B1B;}
          .alert-info{background:#DBEAFE;color:#1E40AF;}
        `}</style>
      </div>
    </>
  );
}
