# Crearelabs Invoice System

Next.js + Upstash Redis + Resend + Fast2SMS — fully persistent, serverless-safe.

---

## 🗄️ Database: Upstash Redis (replaces Vercel KV which was shut down)

Vercel KV was discontinued in Dec 2024. This app now uses **Upstash Redis** which is the official replacement — still free, still auto-injects env vars into Vercel.

---

## 🚀 Complete Deployment Steps

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crearelabs-invoice.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to **vercel.com** → Add New Project → Import your repo
2. Leave all settings default → click **Deploy**
3. Copy your deployment URL (e.g. `https://crearelabs-invoice.vercel.app`)

### 3. Add Upstash Redis (Database)

1. In Vercel dashboard → click **"Marketplace"** in the left sidebar (or top nav)
2. Search for **"Upstash"** → click it → click **"Install"**
3. Click **"Add Integration"**
4. It opens upstash.com — sign up free (no credit card needed)
5. After signup, click **"Create Database"**
6. Name: `crearelabs` → Region: **eu-west-1** (closest to India with free tier) → click **Create**
7. Go back to Vercel integration page → select your new database → select your project → click **Save**
8. ✅ Done — Vercel auto-adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your project

### 4. Set Up Resend (Email)

1. Go to **resend.com** → Sign up free (use Google)
2. Left sidebar → **API Keys** → **Create API Key** → name it `Crearelabs` → click Add
3. Copy the key (starts with `re_`) — shown only once
4. In Vercel → your project → **Settings → Environment Variables** → add:
   - `RESEND_API_KEY` → paste your key
   - `RESEND_FROM_EMAIL` → `onboarding@resend.dev`

### 5. Set Up Fast2SMS (OTP SMS — optional but recommended)

1. Go to **fast2sms.com** → Register
2. After login → **Dev API** in left sidebar → copy your API key
3. In Vercel → Settings → Environment Variables → add:
   - `FAST2SMS_API_KEY` → paste your key

> Without this, OTP is shown on screen. You can add it later.

### 6. Add All Other Environment Variables

In Vercel → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | `Sanjay0911@95` |
| `ADMIN_PHONE` | `+919540117458` |
| `UPI_ID` | `crearelabs@ptaxis` |
| `UPI_NAME` | `Crearelabs` |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` ← your actual URL |

### 7. Redeploy

Vercel → **Deployments** tab → three dots `···` on latest → **Redeploy** → confirm.

---

## 🔐 Admin Login

URL: `https://your-app.vercel.app`

- **OTP:** Click Send OTP → OTP sent to +91 9540117458 via SMS (or shown on screen if Fast2SMS not set up)
- **Password:** `Sanjay0911@95`

---

## 📋 Features

- Create invoices with services → 18% GST auto-calculated
- Unique payment link per client
- Client fills name/email/phone/company/GST on their link
- Discount codes (% or flat ₹) — generated in admin, applied by client
- Invoice email sent to client + sanjaykumar50400@gmail.com on form submit
- UPI payment: Google Pay, PhonePe, Paytm, BHIM, Amazon Pay
- Desktop: QR code with amount pre-filled
- All data persists permanently in Upstash Redis
