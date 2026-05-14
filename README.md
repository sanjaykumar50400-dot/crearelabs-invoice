# Crearelabs Invoice System

Full-stack invoice management — Next.js + Vercel KV + Resend + Fast2SMS.

---

## ✅ What's Fixed vs Previous Version

| Issue | Fix |
|---|---|
| Data lost on refresh | Vercel KV (Redis) — permanent storage |
| Emails not sending | Replaced nodemailer with Resend API |
| OTP not working | Fast2SMS integration (Indian SMS) |
| Password login broken | Fixed comparison against env variable |
| Sessions lost | Sessions stored in KV, expire after 7 days |

---

## 🚀 Deploy to Vercel — Complete Steps

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crearelabs-invoice.git
git push -u origin main
```

### Step 2 — Import on Vercel

1. Go to **vercel.com** → Add New Project → Import your repo
2. Framework: **Next.js** (auto-detected)
3. Click **Deploy** (don't add env vars yet — add KV first)

### Step 3 — Add Vercel KV Storage (Database)

This is critical — without this nothing saves.

1. In your Vercel project → click **Storage** tab
2. Click **Create Database** → choose **KV** → name it `crearelabs-kv`
3. Click **Create & Continue** → **Connect to project** → select your project
4. Click **Connect** — Vercel auto-adds the 4 KV env vars

### Step 4 — Set Up Resend (Email)

1. Go to **resend.com** → Sign up free
2. Dashboard → **API Keys** → Create API Key → copy it
3. In Vercel → your project → **Settings → Environment Variables** → add:
   - `RESEND_API_KEY` = `re_xxxxxxxxxxxx` (your key)
   - `RESEND_FROM_EMAIL` = `onboarding@resend.dev`  
     *(use this for now — it works instantly with no domain setup)*

### Step 5 — Add Fast2SMS (OTP via SMS)

1. Go to **fast2sms.com** → Sign up free (Indian SMS gateway)
2. Dashboard → **Dev API** → copy your API key
3. In Vercel → Environment Variables → add:
   - `FAST2SMS_API_KEY` = your key

> **Without Fast2SMS:** OTP will still work — it shows on screen as fallback. You can add SMS later.

### Step 6 — Add Remaining Environment Variables

In Vercel → Settings → Environment Variables, add these:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | `Sanjay0911@95` |
| `ADMIN_PHONE` | `+919540117458` |
| `UPI_ID` | `crearelabs@ptaxis` |
| `UPI_NAME` | `Crearelabs` |
| `NEXT_PUBLIC_BASE_URL` | *(your Vercel URL, e.g. https://crearelabs-invoice.vercel.app)* |

### Step 7 — Redeploy

After setting all variables:
- Vercel → **Deployments** tab → three dots on latest → **Redeploy**

---

## 🔐 Admin Login

URL: `https://your-app.vercel.app`

- **OTP tab:** Click "Send OTP" → OTP sent to +91 9540117458 via SMS (or shown on screen if Fast2SMS not set up)
- **Password tab:** `Sanjay0911@95`

---

## 📋 How It Works

### Admin creates invoice:
1. Login → **+ New Invoice**
2. Pick services → GST 18% auto-calculated live
3. Click **Generate Link** → copy unique client link

### Client pays:
1. Opens link → fills name, email, phone, company, GST (optional)
2. Enters discount code if they have one
3. Invoice email sent to their email + sanjaykumar50400@gmail.com
4. Chooses UPI app (Google Pay, PhonePe, Paytm, BHIM, Amazon Pay)
5. Desktop: QR code with amount pre-filled
6. Clicks "I have completed the payment" → marked done

### Admin tracks:
- Dashboard shows all invoices with status (sent → pending → paid)
- Clients tab shows all filled client details
- Discounts tab — generate % or flat ₹ codes

---

## 🛠 Local Development

```bash
npm install

# Create .env.local (copy from .env.example and fill values)
# For local KV, you need Vercel CLI:
npm i -g vercel
vercel link        # link to your Vercel project
vercel env pull    # pulls all env vars including KV credentials

npm run dev
```
