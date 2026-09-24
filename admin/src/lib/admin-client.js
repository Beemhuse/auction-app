import { apiRequest } from './api-client';
import { clearAdminKey, getAdminKey } from './admin-session';

/**
 * Request against /api/v1/admin using the stored admin key.
 * A 401 means the key was rotated or revoked, so the session is locked.
 */
export async function adminRequest(path, { key = getAdminKey(), headers, ...options } = {}) {
  try {
    return await apiRequest(`/admin${path}`, { ...options, headers: { 'x-admin-key': key, ...headers } });
  } catch (error) {
    if (error.status === 401 && key === getAdminKey()) clearAdminKey();
    throw error;
  }
}
