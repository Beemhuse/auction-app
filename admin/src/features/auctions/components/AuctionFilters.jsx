import { Search } from 'lucide-react';
import { AUCTION_STATUSES } from '../schemas/auction.schema';

const titleCase = (value) => value.charAt(0) + value.slice(1).toLowerCase();

export function AuctionFilters({ filters, onChange }) {
  return (
    <>
      <label className="search-field">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={filters.q}
          onChange={(event) => onChange('q', event.target.value)}
          placeholder="Search title or ID"
          aria-label="Search auctions"
        />
      </label>
      <select value={filters.status} onChange={(event) => onChange('status', event.target.value)} aria-label="Filter by status">
        <option value="ALL">All statuses</option>
        {AUCTION_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
      </select>
    </>
  );
}
