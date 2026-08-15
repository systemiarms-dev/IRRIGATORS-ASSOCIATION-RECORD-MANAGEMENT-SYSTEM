'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(window.navigator.userAgent);
}

interface InstallAppButtonProps {
  className?: string;
  buttonClassName?: string;
}

/**
 * "Install App" prompt. Shows a native install dialog where the browser
 * supports it (Chrome/Edge via beforeinstallprompt) and an iOS hint
 * (Share -> Add to Home Screen) on iPhones/iPads. Hidden once installed.
 */
export default function InstallAppButton({ className = '', buttonClassName = '' }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setDeferredPrompt(null);
      setIos(false);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setHintOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    if (isIOS()) setIos(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (ios) setHintOpen((open) => !open);
  }

  if (isStandalone() || (!deferredPrompt && !ios)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleInstall}
        className={`inline-flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${buttonClassName}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>

      {hintOpen && (
        <div className="relative z-50 mt-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-100 p-3 text-[11px] shadow-xl max-w-xs">
          <button
            type="button"
            onClick={() => setHintOpen(false)}
            className="absolute top-1.5 right-1.5 text-slate-400 hover:text-white"
            aria-label="Close install instructions"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1.5">
            <Smartphone className="w-3.5 h-3.5" /> Add IARMS to your Home Screen
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-slate-300">
            <li>Tap the <span className="font-bold text-white">Share</span> button in your browser.</li>
            <li>Choose <span className="font-bold text-white">Add to Home Screen</span>.</li>
            <li>Tap <span className="font-bold text-white">Add</span> to install the IARMS app.</li>
          </ol>
        </div>
      )}
    </div>
  );
}