import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

const PwaReloadPrompt = () => {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const initPwa = async () => {
      try {
        const { registerSW } = await import("virtual:pwa-register");
        const update = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            setOfflineReady(true);
          },
        });
        setUpdateSW(() => update);
      } catch {
        // PWA registration not available (dev mode)
      }
    };
    initPwa();
  }, []);

  useEffect(() => {
    if (offlineReady) {
      toast.success("Aplicação pronta para uso offline!");
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh && updateSW) {
      toast("Nova atualização disponível", {
        description: "Clique para recarregar com a versão mais recente.",
        action: {
          label: "Atualizar",
          onClick: () => updateSW(),
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateSW]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-4">
      <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg">
        <WifiOff className="h-4 w-4" />
        Modo offline
      </div>
    </div>
  );
};

export default PwaReloadPrompt;
