import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { AuctionFilters, AuctionFormDialog, AuctionTable, filterAuctions, useAuctionFilters, useOverview } from '@/features/auctions';

export function AuctionsPage() {
  const { data, isLoading, error } = useOverview();
  const { filters, setFilter } = useAuctionFilters();
  // undefined = closed, null = create, auction = edit
  const [editing, setEditing] = useState(undefined);

  const auctions = useMemo(() => filterAuctions(data?.auctions ?? [], filters), [data, filters]);

  return (
    <section className="workspace">
      <PageHeader
        eyebrow="CATALOG"
        title="Auctions"
        actions={(
          <>
            <AuctionFilters filters={filters} onChange={setFilter} />
            <Button icon={Plus} onClick={() => setEditing(null)}>New auction</Button>
          </>
        )}
      />
      <AuctionTable auctions={auctions} isLoading={isLoading} error={error} onEdit={setEditing} />
      {editing !== undefined && <AuctionFormDialog auction={editing} onClose={() => setEditing(undefined)} />}
    </section>
  );
}
