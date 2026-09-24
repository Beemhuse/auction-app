import { Send } from 'lucide-react';
import { StateMessage } from '@/components/ui/StateMessage';

export function OutsideTelegramPage() {
  return (
    <main className="page">
      <StateMessage icon={Send} title="Open this in Telegram">
        This app runs inside Telegram so we know who is bidding. Open the auction bot and tap the Auctions button.
      </StateMessage>
    </main>
  );
}
