import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { addMinor } from '@/lib/money';
import { queryKeys } from '@/lib/query-keys';
import { bidResultSchema, liveStateSchema } from '../schemas/room.schema';
import { useRoomSocket } from './useRoomSocket';

const FEED_SIZE = 20;

/** Folds one accepted bid into the cached live state. Older sequences are ignored. */
function applyBid(state, bid, mine) {
  if (!state || bid.sequence < state.bidCount) return state;
  const sameBid = bid.sequence === state.bidCount;
  return {
    ...state,
    highestBidMinor: String(bid.amountMinor),
    bidCount: bid.sequence,
    minimumNextBidMinor: String(bid.minimumNextBidMinor ?? addMinor(bid.amountMinor, state.minIncrementMinor)),
    effectiveEndsAt: bid.effectiveEndsAt,
    // The broadcast and our own POST response can arrive in either order for the same bid.
    leading: mine || (sameBid && state.leading),
  };
}

/**
 * Everything the live room needs: the state snapshot, the socket feed, and bid placement.
 * `ownSequences` remembers which accepted bids were ours, so broadcasts can tell "you" from "others".
 */
export function useLiveRoom(auctionId, roomToken) {
  const queryClient = useQueryClient();
  const stateKey = queryKeys.liveState(auctionId);
  const ownSequences = useRef(new Set());
  const [feed, setFeed] = useState([]);

  const live = useQuery({
    queryKey: stateKey,
    // receivedAt pairs with serverTime for clock-skew correction; it survives cache updates from bids.
    queryFn: async ({ signal }) => ({ ...await apiRequest('/bids/state', { signal, roomToken, schema: liveStateSchema }), receivedAt: Date.now() }),
    enabled: Boolean(roomToken),
    refetchInterval: 15_000, // fallback for status changes the socket does not announce
  });

  const record = useCallback((bid, mine) => {
    queryClient.setQueryData(stateKey, (state) => applyBid(state, bid, mine));
    setFeed((items) => {
      const rest = items.filter((item) => item.sequence !== bid.sequence);
      const existing = items.find((item) => item.sequence === bid.sequence);
      const entry = { sequence: bid.sequence, amountMinor: String(bid.amountMinor), at: existing?.at ?? Date.now(), mine: mine || Boolean(existing?.mine) };
      return [entry, ...rest].sort((a, b) => b.sequence - a.sequence).slice(0, FEED_SIZE);
    });
  }, [queryClient, stateKey]);

  const connection = useRoomSocket(roomToken, {
    onEvent: (event) => {
      if (event.event === 'bid.accepted') record(event.payload, ownSequences.current.has(event.payload.sequence));
      else if (event.event === 'auction.closed') queryClient.invalidateQueries({ queryKey: stateKey });
    },
    onReconnect: () => queryClient.invalidateQueries({ queryKey: stateKey }),
    onUnauthorized: () => queryClient.invalidateQueries({ queryKey: queryKeys.roomAccess(auctionId) }),
  });

  const placeBid = useMutation({
    mutationFn: (amountMinor) => apiRequest('/bids', {
      roomToken,
      body: { auctionId, requestId: crypto.randomUUID(), amountMinor: Number(amountMinor) },
      schema: bidResultSchema,
    }),
    onSuccess: (result) => {
      if (result.status === 'ACCEPTED') {
        ownSequences.current.add(result.sequence);
        record({ ...result, minimumNextBidMinor: undefined }, true);
      } else if (result.status === 'UNDERBID' && result.detail) {
        queryClient.setQueryData(stateKey, (state) => state && { ...state, minimumNextBidMinor: result.detail, leading: false });
      } else if (result.status === 'CLOSED') {
        queryClient.invalidateQueries({ queryKey: stateKey });
      }
    },
  });

  return { live, feed, connection, placeBid };
}
