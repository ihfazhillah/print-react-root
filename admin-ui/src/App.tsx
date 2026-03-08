import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree';

const router = createRouter({ routeTree, basepath: '/admin' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return <RouterProvider router={router} />;
}
