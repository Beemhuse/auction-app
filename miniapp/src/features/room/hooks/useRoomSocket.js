import { useEffect, useRef, useState } from 'react';
import { WS_BASE } from '@/lib/env';
import { roomEventSchema } from '../schemas/room.schema';

const MAX_BACKOFF_MS = 10_000;
const UNAUTHORIZED = 1008;

/**
 * Live room connection with automatic reconnect. Handlers are read from a ref, so passing new
 * callbacks each render does not reconnect.
 */
export function useRoomSocket(roomToken, { onEvent, onReconnect, onUnauthorized }) {
  const [status, setStatus] = useState('connecting');
  const handlers = useRef({ onEvent, onReconnect, onUnauthorized });
  handlers.current = { onEvent, onReconnect, onUnauthorized };

  useEffect(() => {
    if (!roomToken) return undefined;
    let socket;
    let attempts = 0;
    let timer;
    let disposed = false;

    const connect = () => {
      setStatus(attempts ? 'reconnecting' : 'connecting');
      socket = new WebSocket(`${WS_BASE}/ws/v1/auctions?token=${encodeURIComponent(roomToken)}`);
      socket.onopen = () => {
        if (attempts) handlers.current.onReconnect?.(); // catch up on anything missed while offline
        attempts = 0;
        setStatus('open');
      };
      socket.onmessage = ({ data }) => {
        let parsed;
        try { parsed = roomEventSchema.safeParse(JSON.parse(data)); } catch { return; }
        if (parsed.success) handlers.current.onEvent?.(parsed.data);
      };
      socket.onclose = ({ code }) => {
        if (disposed) return;
        if (code === UNAUTHORIZED) { setStatus('closed'); handlers.current.onUnauthorized?.(); return; }
        attempts += 1;
        setStatus('reconnecting');
        timer = setTimeout(connect, Math.min(1000 * 2 ** (attempts - 1), MAX_BACKOFF_MS));
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [roomToken]);

  return status;
}
