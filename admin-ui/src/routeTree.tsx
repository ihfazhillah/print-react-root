import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { Layout } from './components/Layout';
import { PagesPage } from './pages/PagesPage';
import { TagsPage } from './pages/TagsPage';
import { DevicesPage } from './pages/DevicesPage';
import { InsightsPage } from './pages/InsightsPage';
import { DeviceTimelinePage } from './pages/DeviceTimelinePage';

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PagesPage,
});

const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagsPage,
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/devices',
  component: DevicesPage,
});

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insights',
  component: InsightsPage,
});

const deviceTimelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insights/$deviceId',
  component: DeviceTimelinePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  tagsRoute,
  devicesRoute,
  insightsRoute,
  deviceTimelineRoute,
]);
