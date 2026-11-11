"use client";

import { AlertTriangle, CheckCircle2, Clock3, Eye, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { SourceLinks } from "@/components/learning/source-links";
import type { FlashcardDto, RecallRating } from "@/types/documents";

type ReviewPayload = { reviewId: string; expectedRevision: number; rating: RecallRating };
type PendingReview = { cardId: string; payload: ReviewPayload };
type ReviewQueue = { cards: FlashcardDto[]; totalDue: number };
type ReviewFailure = { message: string; reload: boolean };
type ReviewReceipt = Pick<FlashcardDto, "dueAt">;

const STORAGE_PREFIX = "nalarai:review-intent:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATINGS: { value: RecallRating; label: string; description: string; className: string }[] = [
  { value: "again", label: "Ulangi", description: "Belum ingat", className: "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100" },
  { value: "hard", label: "Sulit", description: "Ingat dengan usaha", className: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100" },
  { value: "good", label: "Baik", description: "Ingat dengan yakin", className: "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100" },
  { value: "easy", label: "Mudah", description: "Ingat tanpa ragu", className: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100" },
];

function storageKey(cardId: string, revision: number) {
  return `${STORAGE_PREFIX}${encodeURIComponent(cardId)}:${revision}`;
}

function writeIntent(intent: PendingReview, remove = false) {
  try {
    const key = storageKey(intent.cardId, intent.payload.expectedRevision);
    if (remove) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(intent.payload));
    return true;
  } catch {
    return false;
  }
}

function restoreIntent(cards: FlashcardDto[], settledIds: Set<string>): { intent: PendingReview | null; available: boolean } {
  try {
    const intents: PendingReview[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      try {
        const identity = key.slice(STORAGE_PREFIX.length);
        const divider = identity.lastIndexOf(":");
        if (divider < 1) continue;
        const cardId = decodeURIComponent(identity.slice(0, divider));
        const revision = Number(identity.slice(divider + 1));
        const raw = sessionStorage.getItem(key);
        if (!cardId || cardId.length > 512 || !Number.isSafeInteger(revision) || revision < 0 || key !== storageKey(cardId, revision) || !raw) continue;
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object") continue;
        const payload = value as Partial<ReviewPayload>;
        if (Object.keys(value).length !== 3 || typeof payload.reviewId !== "string" || !UUID_PATTERN.test(payload.reviewId) ||
          payload.expectedRevision !== revision || !RATINGS.some((rating) => rating.value === payload.rating) || settledIds.has(payload.reviewId)) continue;
        intents.push({ cardId, payload: { reviewId: payload.reviewId, expectedRevision: revision, rating: payload.rating as RecallRating } });
      } catch {
        // Ignore damaged browser state, never reinterpret it as a new rating intent.
        continue;
      }
    }
    for (const card of cards) {
      const match = intents.find((intent) => intent.cardId === card.id && intent.payload.expectedRevision === card.revision);
      if (match) return { intent: match, available: true };
    }
    // A committed request may have left the due queue before its response reached the browser.
    return { intent: intents[0] ?? null, available: true };
  } catch {
    return { intent: null, available: false };
  }
}

function reviewId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isFlashcard(value: unknown): value is FlashcardDto {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<FlashcardDto>;
  return typeof card.id === "string" && typeof card.documentId === "string" && typeof card.documentName === "string" &&
    typeof card.question === "string" && typeof card.answer === "string" &&
    typeof card.dueAt === "string" && Number.isFinite(Date.parse(card.dueAt)) &&
    Number.isSafeInteger(card.revision) && Number(card.revision) >= 0 &&
    typeof card.intervalDays === "number" && Number.isFinite(card.intervalDays) && card.intervalDays >= 0 &&
    Array.isArray(card.sourceRefs) && card.sourceRefs.every((source: unknown) => {
      if (!source || typeof source !== "object") return false;
      const ref = source as Record<string, unknown>;
      return typeof ref.documentId === "string" && typeof ref.segmentId === "string" && typeof ref.label === "string" &&
        (ref.page === undefined || (typeof ref.page === "number" && Number.isSafeInteger(ref.page) && ref.page > 0));
    });
}

function isQueue(value: unknown): value is ReviewQueue {
  if (!value || typeof value !== "object") return false;
  const queue = value as Partial<ReviewQueue>;
  return Array.isArray(queue.cards) && queue.cards.every(isFlashcard) &&
    Number.isSafeInteger(queue.totalDue) && Number(queue.totalDue) >= queue.cards.length &&
    new Set(queue.cards.map((card) => card.id)).size === queue.cards.length;
}

function loadProblem(status: number) {
  if (status === 401) return "Sesi berakhir. Masuk kembali untuk melanjutkan.";
  if (status === 403) return "Kartu ini tidak dapat diakses.";
  return "Kartu belum dapat dimuat. Coba lagi.";
}

function reviewProblem(status: number): ReviewFailure {
  if (status === 409) return { message: "Kartu sudah berubah. Muat ulang untuk melanjutkan.", reload: true };
  if (status === 404) return { message: "Kartu ini sudah tidak tersedia.", reload: true };
  if (status === 401 || status === 403) return { message: "Sesi berakhir. Masuk kembali untuk melanjutkan.", reload: false };
  if ([400, 413, 415, 422].includes(status)) return { message: "Pilihan belum dapat disimpan. Muat ulang lalu coba lagi.", reload: true };
  if (status === 429) return { message: "Terlalu banyak percobaan. Coba lagi nanti.", reload: false };
  return { message: "Belum tersimpan. Coba lagi.", reload: false };
}

export function ReviewDeck() {
  const loadRef = useRef<AbortController | null>(null);
  const reviewRef = useRef<AbortController | null>(null);
  const requestGate = useRef(false);
  const pendingRef = useRef<PendingReview | null>(null);
  const settledIds = useRef(new Set<string>());
  const questionRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const questionId = useId();
  const answerId = useId();
  const ratingId = useId();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pending, setPending] = useState<PendingReview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<ReviewFailure | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [receipt, setReceipt] = useState<ReviewReceipt | null>(null);
  const card = pending
    ? queue?.cards.find((item) => item.id === pending.cardId && item.revision === pending.payload.expectedRevision) ?? null
    : queue?.cards[0] ?? null;
  const cardKey = card ? storageKey(card.id, card.revision) : null;
  const revealed = cardKey !== null && revealedKey === cardKey;
  const selectedLabel = RATINGS.find((rating) => rating.value === pending?.payload.rating)?.label;

  useEffect(() => {
    const controller = new AbortController();
    loadRef.current = controller;
    requestGate.current = true;

    async function loadQueue() {
      try {
        const response = await fetch("/api/flashcards", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data: unknown = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!response.ok || !isQueue(data)) {
          setQueue(null);
          setLoadError(response.ok ? "Kartu belum dapat dimuat. Coba lagi." : loadProblem(response.status));
          return;
        }
        const restored = restoreIntent(data.cards, settledIds.current);
        const intent = pendingRef.current ?? restored.intent;
        pendingRef.current = intent;
        setPending(intent);
        setStorageUnavailable(!restored.available);
        setQueue(data);
        setLoadError(null);
        setRevealedKey(null);
      } catch {
        if (!controller.signal.aborted) {
          setQueue(null);
          setLoadError("Koneksi terputus. Coba lagi.");
        }
      } finally {
        if (loadRef.current === controller) {
          loadRef.current = null;
          requestGate.current = false;
          if (!controller.signal.aborted) setLoading(false);
        }
      }
    }

    void loadQueue();
    return () => {
      controller.abort();
      if (loadRef.current === controller) {
        loadRef.current = null;
        requestGate.current = false;
      }
    };
  }, [loadAttempt]);

  useEffect(() => () => { reviewRef.current?.abort(); }, []);
  useEffect(() => { if (cardKey) questionRef.current?.focus(); }, [cardKey]);
  useEffect(() => { if (revealedKey) answerRef.current?.focus(); }, [revealedKey]);

  function reload(discardRejectedIntent = reviewError?.reload === true) {
    if (requestGate.current) return;
    if (discardRejectedIntent && reviewError?.reload && pendingRef.current) {
      const intent = pendingRef.current;
      settledIds.current.add(intent.payload.reviewId);
      if (!writeIntent(intent, true)) setStorageUnavailable(true);
      pendingRef.current = null;
      setPending(null);
    }
    requestGate.current = true;
    setLoading(true);
    setLoadError(null);
    setReviewError(null);
    setRevealedKey(null);
    setLoadAttempt((current) => current + 1);
  }

  async function submit(intent: PendingReview) {
    if (requestGate.current || pendingRef.current !== intent) return;
    const controller = new AbortController();
    reviewRef.current = controller;
    requestGate.current = true;
    setSubmitting(true);
    setReviewError(null);

    try {
      const response = await fetch(`/api/flashcards/${encodeURIComponent(intent.cardId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(intent.payload),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setReviewError(reviewProblem(response.status));
        if (response.status === 401 || response.status === 403) setRevealedKey(null);
        return;
      }
      const data: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!isFlashcard(data) || data.id !== intent.cardId || data.revision <= intent.payload.expectedRevision) {
        setReviewError({ message: "Belum tersimpan. Coba lagi.", reload: false });
        return;
      }

      if (!settledIds.current.has(intent.payload.reviewId)) {
        settledIds.current.add(intent.payload.reviewId);
        setCompletedCount((current) => current + 1);
      }
      const storageCleared = writeIntent(intent, true);
      const remaining: ReviewQueue | null = queue ? {
        cards: queue.cards.filter((item) => item.id !== intent.cardId),
        totalDue: Math.max(0, queue.totalDue - (queue.cards.some((item) => item.id === intent.cardId) ? 1 : 0)),
      } : null;
      const restored = restoreIntent(remaining?.cards ?? [], settledIds.current);
      pendingRef.current = restored.intent;
      setPending(restored.intent);
      setStorageUnavailable(!storageCleared || !restored.available);
      setQueue(remaining);
      setRevealedKey(null);
      setReceipt({ dueAt: data.dueAt });
    } catch {
      if (!controller.signal.aborted) {
        setReviewError({ message: "Koneksi terputus. Coba lagi.", reload: false });
      }
    } finally {
      if (reviewRef.current === controller) {
        reviewRef.current = null;
        requestGate.current = false;
        if (!controller.signal.aborted) setSubmitting(false);
      }
    }
  }

  function rate(rating: RecallRating) {
    if (!card || !revealed || requestGate.current || pendingRef.current) return;
    let id: string;
    try {
      id = reviewId();
    } catch {
      setReviewError({ message: "Pilihan belum dapat disimpan. Muat ulang halaman lalu coba lagi.", reload: false });
      return;
    }
    const intent: PendingReview = { cardId: card.id, payload: { reviewId: id, expectedRevision: card.revision, rating } };
    pendingRef.current = intent;
    setPending(intent);
    setReceipt(null);
    setStorageUnavailable(!writeIntent(intent));
    void submit(intent);
  }

  return (
    <div data-review-deck className="app-page min-w-0 space-y-5">
      <section className="learn-card min-w-0 p-4 sm:p-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Ulang</h1>
          {!loading && queue ? <span aria-live="polite" className="rounded-full bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-800">{queue.totalDue} kartu</span> : null}
        </div>
        {completedCount > 0 ? <p className="mt-2 text-xs font-bold text-muted">{completedCount} selesai</p> : null}
      </section>

      {receipt ? (
        <div role="status" className="flex min-w-0 items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere]">
            <p className="font-black text-success">Penilaian tersimpan</p>
            <p className="mt-1 text-copy">Ulang <time dateTime={receipt.dueAt} className="font-extrabold text-ink">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.dueAt))}</time></p>
          </div>
        </div>
      ) : null}
      {loading ? <p role="status" className="learn-card p-5 text-sm font-bold text-copy">Memuat kartu...</p> : null}
      {loadError ? (
        <section className="learn-card min-w-0 p-4 sm:p-6">
          <div role="alert" className="flex min-w-0 items-start gap-2 text-sm font-bold leading-6 text-amber-900"><AlertTriangle className="mt-1 size-5 shrink-0" aria-hidden="true" /><p className="min-w-0 [overflow-wrap:anywhere]">{loadError}</p></div>
          <button type="button" disabled={loading || submitting} onClick={() => reload()} className="button-secondary mt-4 min-w-12 max-w-full rounded-full px-3 py-3 text-sm whitespace-normal">Coba lagi</button>
        </section>
      ) : null}

      {!loading && queue && card ? (
        <section data-review-card aria-labelledby={questionId} className="learn-card min-w-0 p-4 sm:p-6">
          <p className="text-xs font-extrabold leading-6 text-cobalt [overflow-wrap:anywhere]">{card.documentName}</p>
          <h2 id={questionId} ref={questionRef} tabIndex={-1} className="mt-4 whitespace-pre-wrap text-xl font-black leading-8 text-ink [overflow-wrap:anywhere]">{card.question}</h2>
          <SourceLinks refs={card.sourceRefs} className="mt-4" />
          {!revealed ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <button type="button" disabled={submitting} onClick={() => setRevealedKey(cardKey)} className="button-primary min-w-0 w-full rounded-full px-3 py-3 text-sm whitespace-normal"><Eye className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Tampilkan jawaban</span></button>
            </div>
          ) : (
            <>
              <div id={answerId} ref={answerRef} tabIndex={-1} role="region" aria-label="Jawaban flashcard" className="mt-5 min-w-0 rounded-[24px] border border-blue-200 bg-blue-50/60 p-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-blue-800">Jawaban</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-copy [overflow-wrap:anywhere]">{card.answer}</p>
              </div>
              <h3 id={ratingId} className="mt-5 text-sm font-black text-ink">Seberapa mudah kamu mengingatnya?</h3>
              <div role="group" aria-labelledby={ratingId} className="mt-3 grid min-w-0 grid-cols-2 gap-2">
                {RATINGS.map((rating) => (
                  <button key={rating.value} type="button" data-rating={rating.value} disabled={submitting || Boolean(pending)} onClick={() => rate(rating.value)} className={`flex min-h-[72px] min-w-0 flex-col items-start justify-center rounded-2xl border px-3 py-3 text-left leading-5 disabled:cursor-not-allowed disabled:opacity-50 ${rating.className}`}>
                    <span className="text-sm font-black [overflow-wrap:anywhere]">{rating.label}</span>
                    <span className="mt-1 text-xs font-semibold [overflow-wrap:anywhere]">{rating.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {!loading && queue && !card && !pending ? (
        <section className="learn-card min-w-0 p-5 text-center sm:p-6">
          <Clock3 className="mx-auto size-9 text-cobalt" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black text-ink [overflow-wrap:anywhere]">{queue.totalDue > 0 ? "Ada kartu berikutnya" : "Semua selesai"}</h2>
          <button type="button" onClick={() => reload()} className="button-secondary mt-5 min-w-0 w-full rounded-full px-3 py-3 text-sm whitespace-normal">Periksa lagi</button>
        </section>
      ) : null}

      {pending ? (
        <section aria-busy={submitting} className="learn-card min-w-0 p-4 sm:p-6">
          <p role="status" className="text-sm font-extrabold leading-6 text-sapphire [overflow-wrap:anywhere]">{submitting ? "Menyimpan..." : `${selectedLabel} belum tersimpan.`}</p>
          {storageUnavailable ? <p role="status" className="mt-2 text-xs font-bold leading-6 text-amber-900">Jangan tutup halaman sampai pilihan tersimpan.</p> : null}
          {reviewError ? <p role="alert" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900 [overflow-wrap:anywhere]">{reviewError.message}</p> : null}
          <button
            type="button"
            disabled={loading || submitting}
            onClick={() => { if (reviewError?.reload) reload(true); else if (pendingRef.current) void submit(pendingRef.current); }}
            className="button-secondary mt-4 min-w-0 w-full rounded-full px-3 py-3 text-sm whitespace-normal"
          >
            <RefreshCw className={`size-4 shrink-0 ${submitting ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{submitting ? "Menyimpan..." : reviewError?.reload ? "Muat ulang" : "Coba lagi"}</span>
          </button>
        </section>
      ) : reviewError ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 [overflow-wrap:anywhere]">{reviewError.message}</p> : null}
    </div>
  );
}
