import { useState, useEffect } from 'react';

// Register Service Worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener());
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener());
    console.log('[PWA] Convera installed successfully');
  });
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(Boolean(deferredPrompt));
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(Boolean(isStandalone));
    };

    checkInstalled();

    const update = () => {
      setCanInstall(Boolean(deferredPrompt));
      checkInstalled();
    };

    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      setCanInstall(false);
      listeners.forEach((listener) => listener());

      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      return choice.outcome === 'accepted';
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
      deferredPrompt = null;
      setCanInstall(false);
      listeners.forEach((listener) => listener());
      return false;
    }
  };

  return { canInstall, isInstalled, installApp };
}
