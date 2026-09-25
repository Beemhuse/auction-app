import { z } from 'zod';
import { API_BASE } from './env';

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
 * Low-level JSON request. Pass `schema` to validate the response body with Zod.
 * `headers` are merged over the JSON defaults.
 */
export async function apiRequest(path, { schema, body, headers, signal, method = body ? 'POST' : 'GET' } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      // Fastify rejects a JSON content-type with an empty body, e.g. a bodiless POST action.
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause;
    throw new ApiError('Could not reach the API. Check that the server is running.', { status: 0 });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(readMessage(data, response.status), { status: response.status, body: data });
  if (!schema) return data;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(`Unexpected response shape from ${path}`, z.prettifyError(parsed.error));
    throw new ApiError('The API returned data in an unexpected format.', { status: response.status, body: data });
  }
  return parsed.data;
}
