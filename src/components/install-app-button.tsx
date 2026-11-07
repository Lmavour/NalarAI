"use client";

import { CheckCircle2, Download, MonitorDown, Share, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallAppButtonProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function subscribeToInstallState(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

export function InstallAppButton({ className = "", compact = false, inverse = false }: InstallAppButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installedAfterPrompt, setInstalledAfterPrompt] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const standaloneInstalled = useSyncExternalStore(subscribeToInstallState, isStandalone, () => false);
  const installed = standaloneInstalled || installedAfterPrompt;

  useEffect(() => {
    if (!showHelp) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [showHelp]);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }

    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === "accepted") setInstalledAfterPrompt(true);
    setPromptEvent(null);
  }

  if (installed) {
    return (
      <span className={`inline-flex items-center gap-2 text-sm font-extrabold ${inverse ? "text-blue-100" : "text-success"} ${className}`}>
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {compact ? "Terpasang" : "Aplikasi terpasang"}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className={`${inverse ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : "border-line bg-white text-sapphire hover:border-blue-300 hover:bg-ice"} inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border px-4 text-sm font-[850] transition ${className}`}
      >
        <Download className="size-4" aria-hidden="true" />
        {compact ? "Install" : "Install aplikasi"}
      </button>

      {showHelp ? (
        <dialog
          ref={dialogRef}
          aria-labelledby="install-title"
          onCancel={() => setShowHelp(false)}
          onClick={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}
          className="app-dialog m-auto max-h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom)_-_32px)] w-[calc(100%_-_32px)] max-w-md overflow-y-auto overscroll-contain rounded-[26px] border border-line bg-white p-0 text-ink shadow-float"
        >
          <section
            className="min-w-0 p-5 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-ice text-cobalt">
                <MonitorDown className="size-6" aria-hidden="true" />
              </span>
              <button type="button" className="grid size-12 place-items-center rounded-full text-muted hover:bg-ice" onClick={() => setShowHelp(false)} aria-label="Tutup petunjuk install">
                <X className="size-5" />
              </button>
            </div>
            <h2 id="install-title" className="text-2xl font-[900] leading-tight tracking-tight text-ink">Bawa NalarAI ke layar utama</h2>
            <p className="mt-3 text-sm leading-7 text-copy">
              Pilih menu browser lalu <strong>Install app</strong>. Di iPhone atau iPad, tekan <Share className="mx-1 inline size-4" aria-hidden="true" /> <strong>Bagikan</strong>, lalu <strong>Tambahkan ke Layar Utama</strong>.
            </p>
            <button type="button" onClick={() => setShowHelp(false)} className="button-primary mt-6 w-full">Mengerti</button>
          </section>
        </dialog>
      ) : null}
    </>
  );
}
