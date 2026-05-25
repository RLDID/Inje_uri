const PENDING_STORAGE_KEY = 'injeuri:pwa-install-login-popup-pending';
const DISMISSED_STORAGE_KEY = 'injeuri:pwa-install-login-popup-dismissed';

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function isRunningAsInstalledPwa() {
  if (!canUseStorage()) {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

export function hasDismissedPwaInstallPopup() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true' || isRunningAsInstalledPwa();
  } catch {
    return isRunningAsInstalledPwa();
  }
}

export function markPwaInstallPopupPending() {
  if (!canUseStorage() || hasDismissedPwaInstallPopup()) {
    return;
  }

  try {
    window.sessionStorage.setItem(PENDING_STORAGE_KEY, 'true');
  } catch {
    // Storage can fail in private browsing. The popup is optional, so ignore it.
  }
}

export function shouldShowPwaInstallPopup() {
  if (!canUseStorage() || hasDismissedPwaInstallPopup()) {
    return false;
  }

  try {
    return window.sessionStorage.getItem(PENDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function clearPwaInstallPopupPending() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function dismissPwaInstallPopupPermanently() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    clearPwaInstallPopupPending();
  } catch {
    // Ignore storage failures. The close action still works for the current view.
  }
}
