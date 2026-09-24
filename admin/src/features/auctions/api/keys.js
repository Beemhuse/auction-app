export const auctionKeys = {
  all: ['auctions'],
  overview: () => [...auctionKeys.all, 'overview'],
  detail: (id) => [...auctionKeys.all, 'detail', id],
  registrations: (id) => [...auctionKeys.detail(id), 'registrations'],
  bids: (id) => [...auctionKeys.detail(id), 'bids'],
};
