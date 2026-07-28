import { registerSocialRoutes } from './routes/social.js';
export function createApp() {
  const routes = [];
  registerSocialRoutes({ post: (path) => routes.push(path) });
  return routes;
}
