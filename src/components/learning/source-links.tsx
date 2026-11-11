"use client";

import { BookOpen, RefreshCw, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { SourceReference, SourceSegment } from "@/types/documents";

type SourcePreview = SourceSegment & { documentName: string };
type SourceState =
  | { status: "loading" }
  | { status: "ready"; source: SourcePreview }
  | { status: "error"; message: string };

function isSourcePreview(value: unknown): value is SourcePreview {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<SourcePreview>;
  return typeof source.documentName === "string" && typeof source.id === "string" &&
    typeof source.label === "string" && typeof source.text === "string" &&
    (source.page === undefined || (Number.isSafeInteger(source.page) && Number(source.page) > 0)) &&
    (source.section === undefined || typeof source.section === "string");
}

function sourceError(status: number) {
  if (status === 401) return "Sesi masukmu berakhir. Masuk kembali untuk membaca sumber pribadi.";
  if (status === 403) return "Kamu tidak memiliki akses ke sumber pribadi ini.";
  if (status === 404) return "Sumber tidak ditemukan. Dokumen mungkin sudah dihapus.";
  if (status === 503) return "Layanan sumber sedang tidak tersedia. Teks belum dapat dimuat; coba lagi sebentar.";
  return "Sumber belum dapat dimuat. Coba lagi sebentar.";
}

function SourceViewer({ source, trigger, onClose }: {
  source: SourceReference;
  trigger: HTMLButtonElement;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const loadingGate = useRef(false);
  const titleId = useId();
  const [state, setState] = useState<SourceState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [trigger]);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    loadingGate.current = true;

    async function loadSource() {
      try {
        const response = await fetch(`/api/documents/${encodeURIComponent(source.documentId)}/sources/${encodeURIComponent(source.segmentId)}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setState({ status: "error", message: sourceError(response.status) });
          return;
        }
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (!isSourcePreview(data) || data.id !== source.segmentId) {
          setState({ status: "error", message: "Konfirmasi sumber tidak valid. Coba muat ulang sumber." });
          return;
        }
        setState({ status: "ready", source: data });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: "Tidak dapat terhubung ke layanan sumber. Periksa koneksi lalu coba lagi." });
        }
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          loadingGate.current = false;
        }
      }
    }

    void loadSource();
    return () => {
      controller.abort();
      if (requestRef.current === controller) {
        requestRef.current = null;
        loadingGate.current = false;
      }
    };
  }, [source.documentId, source.segmentId, attempt]);

  function retry() {
    if (loadingGate.current) return;
    loadingGate.current = true;
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }

  return (
    <dialog
      ref={dialogRef}
      data-source-viewer
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClose={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      onKeyUp={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        // React events bubble through nested dialogs even though the native top layer is inert.
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
          .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable.at(-1);
        const active = document.activeElement;
        if ((event.shiftKey && active === first) || (!event.shiftKey && active === last) || !event.currentTarget.contains(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      className="app-dialog fixed inset-0 m-0 flex h-dvh max-h-none w-full max-w-none items-center justify-center overflow-hidden border-0 bg-transparent pb-[max(12px,var(--safe-bottom))] pl-[max(12px,var(--safe-left))] pr-[max(12px,var(--safe-right))] pt-[max(12px,var(--safe-top))] text-ink"
    >
      <section className="flex max-h-[min(640px,100%)] min-h-0 w-full min-w-0 max-w-2xl flex-col overflow-hidden rounded-[28px] border border-line bg-white shadow-float">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <h2 id={titleId} className="min-w-0 text-base font-black leading-6 [overflow-wrap:anywhere]">Sumber dokumen</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup sumber" className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600 hover:bg-blue-50">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div tabIndex={0} aria-label="Isi sumber" aria-busy={state.status === "loading"} className="max-h-[70dvh] min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 [overflow-wrap:anywhere] sm:px-6">
          {state.status === "loading" ? (
            <div role="status" className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-extrabold text-blue-800">Memuat {source.label || "sumber dokumen"}...</p>
            </div>
          ) : null}
          {state.status === "error" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p role="alert" className="text-sm font-bold leading-6 text-amber-900">{state.message}</p>
              <button type="button" onClick={retry} className="button-secondary mt-4 min-w-12 max-w-full rounded-full px-3 py-2 text-sm whitespace-normal">
                <RefreshCw className="size-4 shrink-0" aria-hidden="true" /> Coba muat sumber lagi
              </button>
            </div>
          ) : null}
          {state.status === "ready" ? (
            <>
              <p className="text-xs font-extrabold leading-5 text-cobalt">{state.source.documentName}</p>
              <h3 className="mt-2 text-lg font-black leading-7">{state.source.label}</h3>
              {state.source.page !== undefined || state.source.section ? (
                <p className="mt-2 text-xs font-bold leading-5 text-muted">
                  {state.source.page !== undefined ? `Halaman ${state.source.page}` : null}
                  {state.source.page !== undefined && state.source.section ? " / " : null}
                  {state.source.section}
                </p>
              ) : null}
              <p data-source-text className="mt-4 whitespace-pre-wrap rounded-2xl border border-line bg-canvas p-4 text-sm leading-7 text-copy [overflow-wrap:anywhere]">{state.source.text}</p>
            </>
          ) : null}
        </div>
      </section>
    </dialog>
  );
}

export function SourceLinks({ refs, className = "" }: { refs?: SourceReference[]; className?: string }) {
  const [openSource, setOpenSource] = useState<{ source: SourceReference; trigger: HTMLButtonElement } | null>(null);
  if (!refs?.length) return null;

  return (
    <div data-source-links role="group" aria-label="Rujukan sumber" className={`flex min-w-0 max-w-full flex-wrap gap-2 ${className}`}>
      {refs.map((source, index) => (
        <button
          key={`${source.documentId}:${source.segmentId}:${index}`}
          type="button"
          aria-haspopup="dialog"
          onClick={(event) => setOpenSource({ source, trigger: event.currentTarget })}
          className="inline-flex min-h-12 min-w-12 max-w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-extrabold leading-5 text-blue-800 hover:bg-blue-100"
        >
          <BookOpen className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{source.label || "Lihat sumber"}{source.page !== undefined ? ` (hlm. ${source.page})` : ""}</span>
        </button>
      ))}
      {openSource ? <SourceViewer key={`${openSource.source.documentId}:${openSource.source.segmentId}`} source={openSource.source} trigger={openSource.trigger} onClose={() => setOpenSource(null)} /> : null}
    </div>
  );
}
