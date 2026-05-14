// Persistent store using Vercel KV (Redis)
// All data survives serverless cold starts and deploys

import { kv } from '@vercel/kv';

export interface Service {
  id: string;
  name: string;
  amount: number;
  desc?: string;
}

export interface InvoiceService {
  id: string;
  name: string;
  amount: number;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  used: boolean;
  createdAt: number;
  usedBy?: string;
}

export interface Invoice {
  id: string;
  title: string;
  services: InvoiceService[];
  subtotal: number;
  gst: number;
  gstAmount: number;
  total: number;
  notes?: string;
  status: 'sent' | 'pending' | 'paid';
  created: number;
  clientFilled: boolean;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  clientGST?: string;
  discountCode?: string;
  discountAmount?: number;
  finalTotal?: number;
  emailSent?: boolean;
}

// ─── Services ─────────────────────────────────────────
export async function getServices(): Promise<Service[]> {
  const data = await kv.get<Service[]>('services');
  if (data && data.length > 0) return data;
  // Seed defaults on first run
  const defaults: Service[] = [
    { id: 's1', name: 'Logo Design', amount: 5000, desc: 'Brand logo with multiple concepts' },
    { id: 's2', name: 'Website Design', amount: 25000, desc: 'Full responsive website UI/UX' },
    { id: 's3', name: 'Social Media Package', amount: 8000, desc: 'Monthly social media management' },
    { id: 's4', name: 'Brand Identity', amount: 15000, desc: 'Complete branding kit' },
  ];
  await kv.set('services', defaults);
  return defaults;
}

export async function saveServices(services: Service[]): Promise<void> {
  await kv.set('services', services);
}

// ─── Invoices ─────────────────────────────────────────
export async function getInvoices(): Promise<Invoice[]> {
  return (await kv.get<Invoice[]>('invoices')) ?? [];
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await kv.set('invoices', invoices);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const invoices = await getInvoices();
  return invoices.find(i => i.id === id) ?? null;
}

export async function updateInvoice(updated: Invoice): Promise<void> {
  const invoices = await getInvoices();
  const idx = invoices.findIndex(i => i.id === updated.id);
  if (idx >= 0) invoices[idx] = updated;
  else invoices.push(updated);
  await saveInvoices(invoices);
}

// ─── Discount Codes ───────────────────────────────────
export async function getDiscounts(): Promise<DiscountCode[]> {
  const data = await kv.get<DiscountCode[]>('discounts');
  if (data && data.length > 0) return data;
  const defaults: DiscountCode[] = [
    { id: 'dc1', code: 'LAUNCH20', type: 'percent', value: 20, used: false, createdAt: Date.now() },
    { id: 'dc2', code: 'FLAT500', type: 'flat', value: 500, used: false, createdAt: Date.now() },
  ];
  await kv.set('discounts', defaults);
  return defaults;
}

export async function saveDiscounts(discounts: DiscountCode[]): Promise<void> {
  await kv.set('discounts', discounts);
}

// ─── Sessions ─────────────────────────────────────────
export async function createSession(token: string): Promise<void> {
  // Sessions expire after 7 days
  await kv.set(`session:${token}`, '1', { ex: 60 * 60 * 24 * 7 });
}

export async function verifySession(token: string): Promise<boolean> {
  const val = await kv.get(`session:${token}`);
  return val === '1';
}

export async function deleteSession(token: string): Promise<void> {
  await kv.del(`session:${token}`);
}

// ─── OTP ──────────────────────────────────────────────
export async function saveOTP(otp: string): Promise<void> {
  // OTP expires in 10 minutes
  await kv.set('admin:otp', otp, { ex: 600 });
}

export async function getOTP(): Promise<string | null> {
  return kv.get<string>('admin:otp');
}

export async function deleteOTP(): Promise<void> {
  await kv.del('admin:otp');
}
