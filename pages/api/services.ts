import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../lib/store';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = getStore();

  if (req.method === 'GET') {
    return res.json(store.services);
  }

  if (req.method === 'POST') {
    const { name, amount, desc } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Name and amount required' });
    const svc = { id: uuidv4(), name, amount: Number(amount), desc: desc || '' };
    store.services.push(svc);
    return res.json(svc);
  }

  if (req.method === 'PUT') {
    const { id, name, amount, desc } = req.body;
    const svc = store.services.find(s => s.id === id);
    if (!svc) return res.status(404).json({ error: 'Not found' });
    svc.name = name;
    svc.amount = Number(amount);
    svc.desc = desc || '';
    return res.json(svc);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    store.services = store.services.filter(s => s.id !== id);
    return res.json({ success: true });
  }

  res.status(405).end();
}
