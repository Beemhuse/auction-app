import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/features/auth';
import { LoginPage } from '@/pages/LoginPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

/** Lazy route module: each page becomes its own Vite chunk. */
const page = (load, name) => async () => ({ Component: (await load())[name] });

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <p className="app-shell page-loading">Loading...</p>,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, lazy: page(() => import('@/pages/DashboardPage'), 'DashboardPage') },
          { path: 'auctions', lazy: page(() => import('@/pages/AuctionsPage'), 'AuctionsPage') },
          { path: 'auctions/:auctionId', lazy: page(() => import('@/pages/AuctionDetailPage'), 'AuctionDetailPage') },
          { path: '*', lazy: page(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
        ],
      },
    ],
  },
]);
