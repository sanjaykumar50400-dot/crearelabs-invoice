import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

let memServices: any[] = [
  { id: 's1', name: 'Logo Design', amount: 5000, desc: 'Brand logo with multiple concepts' },
  { id: 's2', name: 'Website Design', amount: 25000, desc: 'Full responsive website UI/UX' },
  { id: 's3', name: 'Social Media Package', amount: 8000, desc: 'Monthly social media management' },
  { id: 's4', name: 'Brand Identity', amount: 15000, desc: 'Complete branding kit' },
];

async function readServices() {
  try {
    const { getServices } = await import('../../lib/store');
    const data = await getServices();
    if (data && data.length > 0) { memServices = data; return data; }
  } catch {}
  return memServices;
}

async function writeServices(services: any[]) {
  memServices = services;
  try {
    const { saveServices } = await import('../../lib/store');
    await saveServices(services);
  } catch {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.json(await readServices());
  }

  if (req.method === 'POST') {
    const { name, amount, desc } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Name and amount required' });
    const services = await readServices();
    const svc = { id: uuidv4(), name, amount: Number(amount), desc: desc || '' };
    services.push(svc);
    await writeServices(services);
    return res.json(svc);
  }

  if (req.method === 'PUT') {
    const { id, name, amount, desc } = req.body;
    const services = await readServices();
    const idx = services.findIndex((s: any) => s.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    services[idx] = { ...services[idx], name, amount: Number(amount), desc: desc || '' };
    await writeServices(services);
    return res.json(services[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const services = await readServices();
    await writeServices(services.filter((s: any) => s.id !== id));
    return res.json({ success: true });
  }

  res.status(405).end();
}
