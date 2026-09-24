import { z } from 'zod';
import { API_BASE } from './env';
import { getInitData } from './telegram';

const BEHIND_NGROK = /\.ngrok(-free)?\.(app|dev|io)\//.test(API_BASE);

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const readMessage = (body, status) => {
  const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
  return message || `Request failed (${status})`;
};

/**
 * JSON request to /api/v1. `auth: 'telegram'` sends the Mini App initData; `roomToken` sends the
 * live-room bearer token. Pass `schema` to validate the response with Zod.
 */
export async function apiRequest(path, { schema, body, auth, roomToken, signal, method = body ? 'POST' : 'GET' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  // ngrok's free tier answers browser requests with a warning page unless this header is present.
  if (import.meta.env.DEV || BEHIND_NGROK) headers['ngrok-skip-browser-warning'] = '1';
  if (auth === 'telegram') headers['x-telegram-init-data'] = getInitData();
  if (roomToken) headers.Authorization = `Bearer ${roomToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, signal, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause;
    throw new ApiError('Connection problem. Check your internet and try again.', { status: 0 });
  }

  // A web page instead of JSON means the request never reached the API, e.g. VITE_API_URL was
  // missing at build time and a hosting rewrite served index.html.
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) {
    console.error(`Expected JSON from ${API_BASE}${path}, got ${response.headers.get('content-type')}`);
    throw new ApiError(`Could not reach the auction server (${API_BASE}). Check VITE_API_URL and redeploy.`, { status: response.status });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(readMessage(data, response.status), { status: response.status, body: data });
  if (!schema) return data;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(`Unexpected response shape from ${path}`, z.prettifyError(parsed.error));
    throw new ApiError('Something went wrong loading this. Please try again.', { status: response.status, body: data });
  }
  return parsed.data;
}
