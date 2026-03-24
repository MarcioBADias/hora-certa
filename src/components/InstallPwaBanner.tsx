import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-banner-dismissed";

const InstallPwaBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  // Show on mobile when not installed and not dismissed
  // Also show if deferredPrompt is available (Android/Chrome desktop)
  const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const showBanner = !isInstalled && !dismissed && (isMobile || deferredPrompt);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-500 md:bottom-4 md:left-4 md:right-auto md:max-w-sm">
      <div className="mx-3 mb-3 rounded-xl border border-border bg-card p-4 shadow-lg md:mx-0">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-card-foreground">
              Instalar Controle do Ponto
            </p>
            <p className="text-xs text-muted-foreground">
              {isIos
                ? 'Toque em "Compartilhar" e depois "Adicionar à Tela de Início" para instalar.'
                : "Instale o app no seu dispositivo para acesso rápido e uso offline."}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isIos && deferredPrompt && (
          <Button
            onClick={handleInstall}
            className="mt-3 w-full gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Instalar agora
          </Button>
        )}
      </div>
    </div>
  );
};

export default InstallPwaBanner;
