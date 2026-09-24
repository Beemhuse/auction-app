import { useEffect } from 'react';

/**
 * Thin wrapper over window.Telegram.WebApp. telegram-web-app.js defines the object even in a
 * normal browser (with empty initData), so every feature is gated on the client version.
 */
const webApp = window.Telegram?.WebApp;

const supports = (version) => Boolean(webApp?.isVersionAtLeast?.(version));

/** Signed launch data proving who the user is. Sent to the API as `x-telegram-init-data`. */
export function getInitData() {
  if (webApp?.initData) return webApp.initData;
  return import.meta.env.DEV ? import.meta.env.VITE_DEV_INIT_DATA || '' : '';
}

export const isAuthenticated = () => Boolean(getInitData());

export function getTelegramUser() {
  if (webApp?.initDataUnsafe?.user) return webApp.initDataUnsafe.user;
  const user = new URLSearchParams(getInitData()).get('user');
  try { return user ? JSON.parse(user) : null; } catch { return null; }
}

export function initTelegram() {
  webApp?.ready();
  webApp?.expand();
}

/** Auction to open first: `?auction=` from the bot's button, or `startapp=` from a t.me/<bot>/<app> link. */
export function launchAuctionId() {
  return new URLSearchParams(window.location.search).get('auction') || webApp?.initDataUnsafe?.start_param || null;
}

export const haptic = {
  success: () => supports('6.1') && webApp.HapticFeedback.notificationOccurred('success'),
  error: () => supports('6.1') && webApp.HapticFeedback.notificationOccurred('error'),
  warning: () => supports('6.1') && webApp.HapticFeedback.notificationOccurred('warning'),
  tap: () => supports('6.1') && webApp.HapticFeedback.impactOccurred('light'),
};

/** Opens payment pages and other external links outside the Mini App webview. */
export function openExternalLink(url) {
  if (supports('6.1')) webApp.openLink(url);
  else window.open(url, '_blank', 'noopener');
}

export const hasNativeBackButton = () => supports('6.1');

/** Shows Telegram's header back button while mounted. Returns false when unavailable so pages can render their own. */
export function useTelegramBackButton(onBack) {
  const native = hasNativeBackButton();
  useEffect(() => {
    if (!native) return undefined;
    webApp.BackButton.onClick(onBack);
    webApp.BackButton.show();
    return () => {
      webApp.BackButton.offClick(onBack);
      webApp.BackButton.hide();
    };
  }, [native, onBack]);
  return native;
}
