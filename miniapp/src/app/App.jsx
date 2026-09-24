import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { StateMessage } from '@/components/ui/StateMessage';
import { ToastProvider } from '@/components/ui/Toast';
import { CONFIG_ERROR } from '@/lib/env';
import { isAuthenticated } from '@/lib/telegram';
import { OutsideTelegramPage } from '@/pages/OutsideTelegramPage';
import { queryClient } from './query-client';
import { router } from './router';

export default function App() {
  if (CONFIG_ERROR) return <main className="page"><StateMessage title="App misconfigured">{CONFIG_ERROR}</StateMessage></main>;
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
