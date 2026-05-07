import { DatabaseQueue, audit } from '../lib/db';
import helper from './helper.js';

export function registerSocialRoutes(app: { post(path: string, handler: () => void): void }) {
  const queue = new DatabaseQueue();
  app.post('/social/publish', () => queue.enqueue(audit(helper('social'))));
}
