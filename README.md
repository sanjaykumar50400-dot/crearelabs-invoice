# Crearelabs Invoice System

A full-stack invoice management system built with Next.js. Supports:
- Admin dashboard (OTP + password login)
- Service management with 18% GST auto-calculation
- Invoice creation with unique client links
- Discount code generation (admin only)
- Client form → UPI payment page
- QR code auto-generated on desktop (amount pre-filled)
- Invoice emails sent to client + sanjaykumar50400@gmail.com via Gmail

---

## 🚀 Deploy to Vercel (Step-by-Step)

### Step 1 — Upload to GitHub

1. Create a new GitHub repo at https://github.com/new (name it `crearelabs-invoice`, keep it **private**)
2. On your computer, open a terminal in this folder and run:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/crearelabs-invoice.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign in (or sign up free)
2. Click **"Add New Project"**
3. Import your `crearelabs-invoice` GitHub repo
4. Leave all build settings as default (Vercel auto-detects Next.js)
5. Before clicking Deploy, click **"Environment Variables"** and add these:

| Variable | Value |
|---|---|
| `GMAIL_USER` | `sanjaykumar50400@gmail.com` |
| `GMAIL_APP_PASSWORD` | *(your Gmail App Password — see below)* |
| `ADMIN_PHONE` | `+919540117458` |
| `ADMIN_PASSWORD` | `Sanjay0911@95` |
| `UPI_ID` | `crearelabs@ptaxis` |
| `UPI_NAME` | `Crearelabs` |
| `NEXT_PUBLIC_BASE_URL` | *(leave blank for now — fill after first deploy)* |

6. Click **Deploy**
7. Once deployed, copy your URL (e.g. `https://crearelabs-invoice.vercel.app`)
8. Go to Vercel → Settings → Environment Variables → add/update:
   - `NEXT_PUBLIC_BASE_URL` = `https://crearelabs-invoice.vercel.app`
9. Go to Deployments → click **Redeploy** on your latest deployment

---

## 📧 Gmail App Password Setup (Required for email)

1. Go to https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Make sure **2-Step Verification** is ON (enable it if not)
4. Search for **"App passwords"** or go to: https://myaccount.google.com/apppasswords
5. Select **Mail** as the app, **Other** as device → type "Crearelabs Invoice"
6. Click **Generate** → copy the 16-character password
7. Paste it as `GMAIL_APP_PASSWORD` in Vercel environment variables

---

## 🔐 Admin Login

**URL:** `https://your-app.vercel.app`

- **Phone OTP tab:** OTP is currently shown in demo mode (no SMS gateway connected). To send real SMS, integrate MSG91 or Fast2SMS in `pages/api/auth.ts`
- **Password tab:** `Sanjay0911@95`

---

## 📋 How to Use

### Creating an Invoice
1. Login → Admin Dashboard
2. Click **+ New Invoice**
3. Select services (each has name + amount you set)
4. GST 18% is auto-calculated and shown in real-time
5. Add optional notes → click **Generate Link**
6. Copy the link and send to your client via WhatsApp, email, etc.

### Client Experience
1. Client opens link → sees invoice summary
2. Fills: Name, Email, Phone, Company, GST (optional)
3. Can apply a discount code if you shared one
4. Submits → invoice email sent to their email + your Gmail
5. Redirected to payment page:
   - **Mobile:** Tap Google Pay / PhonePe / Paytm / BHIM / Amazon Pay
   - **Desktop:** Scan QR code (amount pre-filled) with any UPI app
6. After paying → clicks "I have completed the payment"

### Discount Codes
1. Admin Dashboard → **Discounts** tab
2. Click **+ Generate Code**
3. Set code (e.g. `WELCOME10`), type (% or flat ₹), value
4. Share code with client — they enter it on the payment form
5. Discount is deducted from the invoice total

---

## 🛠 Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your values in .env.local
npm run dev
```

Open http://localhost:3000

---

## ⚠️ Important Note on Data Persistence

This app uses **in-memory storage** — data resets when the Vercel serverless function restarts (typically every few hours). 

**For permanent data storage**, upgrade to a database. Recommended free options:
- **Supabase** (PostgreSQL) — https://supabase.com
- **PlanetScale** (MySQL) — https://planetscale.com
- **Neon** (PostgreSQL) — https://neon.tech

The `lib/store.ts` file is the only file you'd need to change to add database support.

---

## 📁 Project Structure

```
crearelabs-invoice/
├── pages/
│   ├── index.tsx          # Login page
│   ├── admin.tsx          # Admin dashboard
│   ├── pay/[id].tsx       # Client payment page
│   ├── _app.tsx
│   ├── _document.tsx
│   └── api/
│       ├── auth.ts        # Login / OTP / session
│       ├── services.ts    # Services CRUD
│       ├── invoices.ts    # Invoices CRUD
│       ├── client-submit.ts  # Client form + email trigger
│       ├── discounts.ts   # Discount codes
│       ├── resend-email.ts   # Manual email resend
│       └── qr.ts          # UPI QR code generator
├── lib/
│   ├── store.ts           # In-memory data store
│   └── email.ts           # Nodemailer + HTML email template
├── styles/
│   └── globals.css
├── public/
│   └── favicon.svg
├── vercel.json
├── next.config.js
├── tsconfig.json
├── package.json
├── .env.example           # Copy to .env.local
└── .gitignore
```
