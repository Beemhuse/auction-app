import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'hammerAdminKey';
const listeners = new Set();

const read = () => {
  try { return sessionStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
};

let adminKey = read();

const emit = () => listeners.forEach((listener) => listener());

export const getAdminKey = () => adminKey;

export function setAdminKey(value) {
  adminKey = value;
  try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* storage unavailable: keep in memory */ }
  emit();
}

export function clearAdminKey() {
  if (!adminKey) return;
  adminKey = '';
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  emit();
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAdminKey = () => useSyncExternalStore(subscribe, getAdminKey);
