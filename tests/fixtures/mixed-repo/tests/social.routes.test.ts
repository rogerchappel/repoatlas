import { registerSocialRoutes } from '../src/routes/social';
import { createApp } from '../src/app';

test('registers social routes', () => {
  createApp();
  registerSocialRoutes({ post() {} });
});
