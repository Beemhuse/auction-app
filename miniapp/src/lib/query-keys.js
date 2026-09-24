export const queryKeys = {
  auctions: ['auctions'],
  auction: (id) => ['auctions', id],
  myRegistrations: ['registrations', 'mine'],
  roomAccess: (auctionId) => ['room', auctionId, 'access'],
  liveState: (auctionId) => ['room', auctionId, 'state'],
};
