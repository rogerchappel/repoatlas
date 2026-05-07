import { registerSocialRoutes } from './routes/social';
export function createApp() {
  const routes = [];
  registerSocialRoutes({ post: (path) => routes.push(path) });
  return routes;
}
