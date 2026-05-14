import type { NextApiRequest, NextApiResponse } from 'next';
import { getServices, saveServices, Service } from '../../lib/store';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const services = await getServices();
    return res.json(services);
  }

  if (req.method === 'POST') {
    const { name, amount, desc } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Name and amount required' });
    const services = await getServices();
    const svc: Service = { id: uuidv4(), name, amount: Number(amount), desc: desc || '' };
    services.push(svc);
    await saveServices(services);
    return res.json(svc);
  }

  if (req.method === 'PUT') {
    const { id, name, amount, desc } = req.body;
    const services = await getServices();
    const idx = services.findIndex(s => s.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    services[idx] = { ...services[idx], name, amount: Number(amount), desc: desc || '' };
    await saveServices(services);
    return res.json(services[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const services = await getServices();
    await saveServices(services.filter(s => s.id !== id));
    return res.json({ success: true });
  }

  res.status(405).end();
}
