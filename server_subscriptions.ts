import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { SubscriptionRequest } from './src/types';

const REQUESTS_FILE = path.join(process.cwd(), 'data_subscriptions.json');

function readRequests(): SubscriptionRequest[] {
  try {
    if (fs.existsSync(REQUESTS_FILE)) {
      const data = fs.readFileSync(REQUESTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading subscriptions file:', err);
  }
  return [];
}

function saveRequests(reqs: SubscriptionRequest[]) {
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(reqs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving subscriptions file:', err);
  }
}

export function handleGetSubscriptions(req: Request, res: Response) {
  const reqs = readRequests();
  res.json({ success: true, requests: reqs });
}

export function handleCreateSubscription(req: Request, res: Response) {
  const { userEmail, userName, planName, planTier, priceMAD, tokensCount, userId } = req.body;
  if (!userEmail) {
    return res.status(400).json({ error: 'User email is required' });
  }

  const reqs = readRequests();
  const newRequest: SubscriptionRequest = {
    id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: userId || '',
    userEmail: (userEmail || '').trim(),
    userName: userName || userEmail.split('@')[0],
    planName: planName || 'Pro',
    planTier: planTier || 'pro',
    priceMAD: Number(priceMAD) || 199,
    tokensCount: Number(tokensCount) || 50000,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  reqs.unshift(newRequest);
  saveRequests(reqs);

  res.json({ success: true, request: newRequest });
}

export function handleUpdateSubscriptionStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  const reqs = readRequests();
  const item = reqs.find((r) => r.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Request not found' });
  }

  item.status = status;
  item.updatedAt = new Date().toISOString();
  if (status === 'approved') {
    item.approvedAt = new Date().toISOString();
  }

  saveRequests(reqs);
  res.json({ success: true, request: item });
}

export function handleDeleteSubscription(req: Request, res: Response) {
  const { id } = req.params;
  let reqs = readRequests();
  reqs = reqs.filter((r) => r.id !== id);
  saveRequests(reqs);
  res.json({ success: true });
}
