import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/ui/Toast';
import { isAuthenticated } from '@/lib/telegram';
import { OutsideTelegramPage } from '@/pages/OutsideTelegramPage';
import { queryClient } from './query-client';
import { router } from './router';

export default function App() {
  // Every personal action needs Telegram's signed identity; without it there is nothing useful to show.
  if (!isAuthenticated()) return <OutsideTelegramPage />;
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
