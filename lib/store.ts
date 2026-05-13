// In-memory store - persists during server lifetime
// For production scale, replace with a database (PlanetScale, Supabase, etc.)

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

interface Store {
  services: Service[];
  invoices: Invoice[];
  discountCodes: DiscountCode[];
}

// Global store on Node.js process object (survives hot-reload in dev)
declare global {
  var __store: Store | undefined;
}

function initStore(): Store {
  return {
    services: [
      { id: 's1', name: 'Logo Design', amount: 5000, desc: 'Brand logo with multiple concepts' },
      { id: 's2', name: 'Website Design', amount: 25000, desc: 'Full responsive website UI/UX' },
      { id: 's3', name: 'Social Media Package', amount: 8000, desc: 'Monthly social media management' },
      { id: 's4', name: 'Brand Identity', amount: 15000, desc: 'Complete branding kit' },
    ],
    invoices: [],
    discountCodes: [
      { id: 'dc1', code: 'LAUNCH20', type: 'percent', value: 20, used: false, createdAt: Date.now() },
      { id: 'dc2', code: 'FLAT500', type: 'flat', value: 500, used: false, createdAt: Date.now() },
    ],
  };
}

export function getStore(): Store {
  if (!global.__store) {
    global.__store = initStore();
  }
  return global.__store;
}
