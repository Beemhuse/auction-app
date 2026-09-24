import { createBrowserRouter } from 'react-router';
import { AuctionPage } from '@/pages/AuctionPage';
import { AuctionsPage } from '@/pages/AuctionsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <AuctionsPage /> },
  { path: '/auctions/:auctionId', element: <AuctionPage /> },
  { path: '*', element: <NotFoundPage /> },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });
