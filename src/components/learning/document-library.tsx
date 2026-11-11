"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, FilePlus2, FileText, FolderOpen, Image as ImageIcon, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { SourceLinks } from "@/components/learning/source-links";
import type { ExtractionMode, StudyDocumentDto } from "@/types/documents";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

function fileProblem(file: File, mode: ExtractionMode) {
  if (mode === "text" && /\.(png|jpe?g)$/i.test(file.name)) return "Pilih mode Pindai untuk file gambar.";
  if (mode === "text" && !/\.(pdf|docx)$/i.test(file.name)) return "Pilih file PDF atau DOCX.";
  if (mode === "ocr" && !/\.(pdf|docx|png|jpe?g)$/i.test(file.name)) return "Pilih file PDF, DOCX, PNG, atau JPG.";
  if (file.size === 0) return "File ini kosong. Pilih file lain.";
  if (file.size > MAX_FILE_BYTES) return "File terlalu besar. Pilih file yang lebih kecil.";
  return null;
}

function isStudyDocument(value: unknown): value is StudyDocumentDto {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<StudyDocumentDto>;
  return typeof document.id === "string" && typeof document.name === "string" &&
    (document.kind === "pdf" || document.kind === "docx" || document.kind === "image") &&
    (document.extractionMode === undefined || document.extractionMode === "text" || document.extractionMode === "ocr") &&
    Number.isSafeInteger(document.pageCount) && Number(document.pageCount) >= 0 &&
    Number.isSafeInteger(document.segmentCount) && Number(document.segmentCount) >= 0 &&
    typeof document.createdAt === "string" && Number.isFinite(Date.parse(document.createdAt)) &&
    typeof document.studied === "boolean";
}

function documentError(status: number, data: unknown, fallback: string) {
  const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
  if (status === 401) return "Sesi berakhir. Masuk kembali untuk melanjutkan.";
  if (status === 403) return "Kamu tidak dapat mengakses materi ini.";
  if (code === "DOCUMENT_LIMIT") return "Ruang materi penuh. Hapus satu materi lalu coba lagi.";
  if (status === 404) return "Materi tidak ditemukan.";
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi nanti.";
  if (status === 503) return "Materi belum dapat dimuat. Coba lagi.";
  return fallback;
}

function uploadProblem(status: number, data: unknown) {
  if (!data || typeof data !== "object" || !("code" in data) || typeof data.code !== "string") return null;
  const ocr = ["OCR_SERVICE_UNAVAILABLE", "OCR_INCOMPLETE", "OCR_RATE_LIMIT"].includes(data.code);
  if (!ocr && !["INVALID_DOCUMENT", "DOCUMENT_LIMIT", "UPLOAD_RATE_LIMIT"].includes(data.code)) return null;
  let message = "Dokumen belum dapat diunggah. Coba lagi.";
  if (status === 413) message = "File terlalu besar. Pilih file yang lebih kecil.";
  else if (data.code === "INVALID_DOCUMENT") message = "File ini belum dapat dibaca. Coba file lain.";
  else if (data.code === "DOCUMENT_LIMIT") message = "Ruang materi penuh. Hapus satu materi lalu coba lagi.";
  else if (data.code === "UPLOAD_RATE_LIMIT") message = "Terlalu banyak unggahan. Coba lagi nanti.";
  else if (data.code === "OCR_INCOMPLETE") message = "Sebagian isi belum terbaca. Coba lagi atau gunakan mode Teks.";
  else if (data.code === "OCR_RATE_LIMIT") message = "Pemindaian sedang sibuk. Coba lagi nanti atau gunakan mode Teks.";
  else if (data.code === "OCR_SERVICE_UNAVAILABLE") message = "Pemindaian belum tersedia. Coba lagi atau gunakan mode Teks.";
  return {
    message,
    ocr,
    fallbackMode: ocr && "fallbackMode" in data && data.fallbackMode === "text" ? "text" as const : null,
  };
}

export function DocumentLibrary({ onStudy, isGenerating }: {
  onStudy: (document: StudyDocumentDto) => void;
  isGenerating: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const loadRef = useRef<AbortController | null>(null);
  const mutationRef = useRef<AbortController | null>(null);
  const requestGate = useRef(false);
  const formId = useId();
  const modeId = useId();
  const inputId = useId();
  const helpId = useId();
  const filenameId = useId();
  const fileErrorId = useId();
  const listTitleId = useId();
  const [documents, setDocuments] = useState<StudyDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>("text");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [operation, setOperation] = useState<{ kind: "upload" } | { kind: "delete"; id: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ocrFailure, setOcrFailure] = useState<{ fallbackMode: "text" | null } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const locked = loading || Boolean(operation) || isGenerating;

  useEffect(() => {
    const controller = new AbortController();
    loadRef.current = controller;
    requestGate.current = true;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data: unknown = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) setDocuments([]);
          setLoadError(documentError(response.status, data, "Daftar dokumen belum dapat dimuat. Coba lagi."));
          return;
        }
        if (!data || typeof data !== "object" || !("documents" in data) || !Array.isArray(data.documents) || !data.documents.every(isStudyDocument)) {
          setLoadError("Daftar dokumen belum dapat diverifikasi. Coba muat ulang daftar.");
          return;
        }
        setDocuments(data.documents);
        setLoadError(null);
      } catch {
        if (!controller.signal.aborted) setLoadError("Tidak dapat terhubung ke layanan dokumen. Periksa koneksi lalu coba lagi.");
      } finally {
        if (loadRef.current === controller) {
          loadRef.current = null;
          requestGate.current = false;
          if (!controller.signal.aborted) setLoading(false);
        }
      }
    }

    void loadDocuments();
    return () => {
      controller.abort();
      if (loadRef.current === controller) {
        loadRef.current = null;
        requestGate.current = false;
      }
    };
  }, [loadAttempt]);

  useEffect(() => () => { mutationRef.current?.abort(); }, []);

  function reload() {
    if (requestGate.current || isGenerating) return;
    requestGate.current = true;
    setLoading(true);
    setLoadError(null);
    setLoadAttempt((current) => current + 1);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setFile(selected);
    setFileError(selected ? fileProblem(selected, extractionMode) : null);
    setActionError(null);
    setOcrFailure(null);
    setSuccess(null);
  }

  function chooseMode(mode: ExtractionMode) {
    if (requestGate.current || isGenerating) return;
    setExtractionMode(mode);
    setFileError(file ? fileProblem(file, mode) : null);
    setActionError(null);
    setOcrFailure(null);
    setSuccess(null);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestGate.current || isGenerating || !file) return;
    const invalid = fileProblem(file, extractionMode);
    if (invalid) { setFileError(invalid); return; }
    const controller = new AbortController();
    mutationRef.current = controller;
    requestGate.current = true;
    setOperation({ kind: "upload" });
    setActionError(null);
    setOcrFailure(null);
    setSuccess(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("extractionMode", extractionMode);
      const response = await fetch("/api/documents", { method: "POST", body, credentials: "same-origin", signal: controller.signal });
      const data: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const problem = response.status === 401 || response.status === 403 ? null : uploadProblem(response.status, data);
        setOcrFailure(extractionMode === "ocr" ? { fallbackMode: problem?.ocr ? problem.fallbackMode : null } : null);
        setActionError(problem?.message ?? documentError(response.status, null, "Dokumen belum dapat diunggah. Coba lagi."));
        return;
      }
      if (!isStudyDocument(data)) {
        setActionError("Upload belum mendapat konfirmasi yang valid. Muat ulang daftar sebelum mengunggah lagi.");
        return;
      }
      setDocuments((current) => [data, ...current.filter((document) => document.id !== data.id)]);
      setSuccess(`${data.name} siap dipelajari.`);
      setFile(null);
      setFileError(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      if (!controller.signal.aborted) setActionError("Koneksi terputus saat upload. Muat ulang daftar untuk memeriksa hasilnya, lalu coba lagi jika dokumen belum ada.");
    } finally {
      if (mutationRef.current === controller) {
        mutationRef.current = null;
        requestGate.current = false;
        if (!controller.signal.aborted) setOperation(null);
      }
    }
  }

  async function deleteDocument(document: StudyDocumentDto) {
    if (requestGate.current || isGenerating) return;
    requestGate.current = true;
    if (!window.confirm(`Hapus "${document.name}"? Materi, kartu, dan riwayat terkait juga akan dihapus.`)) {
      requestGate.current = false;
      return;
    }
    const controller = new AbortController();
    mutationRef.current = controller;
    setOperation({ kind: "delete", id: document.id });
    setActionError(null);
    setOcrFailure(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(document.id)}`, { method: "DELETE", credentials: "same-origin", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.status !== 204) {
        const data: unknown = await response.json().catch(() => null);
        if (!controller.signal.aborted) setActionError(documentError(response.status, data, "Penghapusan belum dapat dikonfirmasi. Muat ulang daftar sebelum mencoba lagi."));
        return;
      }
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setSuccess(`${document.name} sudah dihapus.`);
    } catch {
      if (!controller.signal.aborted) setActionError("Koneksi terputus saat menghapus. Muat ulang daftar untuk memeriksa apakah dokumen sudah dihapus.");
    } finally {
      if (mutationRef.current === controller) {
        mutationRef.current = null;
        requestGate.current = false;
        if (!controller.signal.aborted) setOperation(null);
      }
    }
  }

  return (
    <div data-document-library className="app-page min-w-0 space-y-5">
      <section className="learn-card min-w-0 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ice text-cobalt"><FolderOpen className="size-5" aria-hidden="true" /></span>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Materi</h1>
        </div>
        <form id={formId} onSubmit={upload} className="mt-4 min-w-0">
          <fieldset disabled={locked} className="mb-4 min-w-0">
            <legend className="sr-only">Cara membaca file</legend>
            <div className="mt-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <label htmlFor={`${modeId}-text`} className={`flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border-2 p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-cobalt ${extractionMode === "text" ? "border-cobalt bg-ice" : "border-line bg-white"} ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input id={`${modeId}-text`} name="extractionMode" type="radio" value="text" checked={extractionMode === "text"} onChange={() => chooseMode("text")} aria-labelledby={`${modeId}-text-label`} aria-describedby={`${modeId}-text-description`} className="mt-1 size-5 shrink-0 accent-cobalt" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <span id={`${modeId}-text-label`} className="block text-sm font-extrabold leading-6 text-ink">Teks</span>
                  <span id={`${modeId}-text-description`} className="block text-xs leading-5 text-copy">PDF atau DOCX</span>
                </span>
              </label>
              <label htmlFor={`${modeId}-ocr`} className={`flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border-2 p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-cobalt ${extractionMode === "ocr" ? "border-cobalt bg-ice" : "border-line bg-white"} ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input id={`${modeId}-ocr`} name="extractionMode" type="radio" value="ocr" checked={extractionMode === "ocr"} onChange={() => chooseMode("ocr")} aria-labelledby={`${modeId}-ocr-label`} aria-describedby={`${modeId}-ocr-description`} className="mt-1 size-5 shrink-0 accent-cobalt" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <span id={`${modeId}-ocr-label`} className="block text-sm font-extrabold leading-6 text-ink">Pindai</span>
                  <span id={`${modeId}-ocr-description`} className="block text-xs leading-5 text-copy">Scan atau gambar</span>
                </span>
              </label>
            </div>
          </fieldset>
          <div className="relative min-w-0">
            <input
              ref={fileRef}
              id={inputId}
              name="file"
              type="file"
              accept={extractionMode === "text" ? ".pdf,.docx" : ".pdf,.docx,.png,.jpg,.jpeg"}
              disabled={Boolean(operation) || isGenerating}
              onChange={chooseFile}
              aria-invalid={Boolean(fileError)}
              aria-describedby={`${helpId}${file ? ` ${filenameId}` : ""}${fileError ? ` ${fileErrorId}` : ""}`}
              className="peer absolute inset-0 z-10 min-h-12 min-w-12 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <label htmlFor={inputId} className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-3 py-3 text-center text-sm font-extrabold leading-6 text-blue-800 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-cobalt peer-disabled:opacity-50">
              <FilePlus2 className="size-5 shrink-0" aria-hidden="true" /><span>Pilih file</span>
            </label>
          </div>
          {file ? <p id={filenameId} className="mt-3 min-w-0 text-sm font-bold leading-6 text-copy [overflow-wrap:anywhere]">{file.name}</p> : null}
          {fileError ? <p id={fileErrorId} role="alert" className="mt-2 text-sm font-bold leading-6 text-danger [overflow-wrap:anywhere]">{fileError}</p> : null}
          <button type="submit" disabled={locked || !file || Boolean(fileError)} aria-busy={operation?.kind === "upload"} className="button-primary mt-4 min-h-12 w-full min-w-0 rounded-full px-3 py-3 text-sm whitespace-normal sm:w-auto">
            <Upload className="size-4 shrink-0" aria-hidden="true" /><span>{operation?.kind === "upload" ? "Mengunggah..." : "Unggah"}</span>
          </button>
        </form>
        <p id={helpId} className="mt-4 border-t border-line pt-4 text-xs leading-5 text-copy">File asli tidak disimpan. Mode Pindai mengirim file ke Gemini; saat dipelajari, teks juga diproses Gemini.</p>
      </section>

      {isGenerating ? <p role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">Menyiapkan materi...</p> : null}
      {actionError ? <div role="alert" className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 [overflow-wrap:anywhere]">
        <p>{actionError}</p>
        {ocrFailure && file && extractionMode === "ocr" ? <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <button type="submit" form={formId} disabled={locked || Boolean(fileError)} className="inline-flex min-h-12 min-w-12 max-w-full items-center justify-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-2 text-sm font-extrabold leading-6 whitespace-normal hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Coba unggah lagi</span>
          </button>
          {ocrFailure.fallbackMode === "text" && /\.(pdf|docx)$/i.test(file.name) ? <button type="button" disabled={locked} onClick={() => chooseMode("text")} className="inline-flex min-h-12 min-w-12 max-w-full items-center justify-center rounded-full border border-amber-300 bg-white px-3 py-2 text-sm font-extrabold leading-6 whitespace-normal hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="min-w-0 [overflow-wrap:anywhere]">Gunakan mode Teks</span>
          </button> : null}
        </div> : null}
      </div> : null}
      {success ? <div role="status" className="flex min-w-0 items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-success"><CheckCircle2 className="mt-1 size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{success}</span></div> : null}

      <section aria-labelledby={listTitleId} aria-busy={loading} className="learn-card min-w-0 p-4 sm:p-6">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h2 id={listTitleId} className="text-xl font-black text-ink">Materi tersimpan</h2>
          {!loading && !loadError ? <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-extrabold text-muted">{documents.length}</span> : null}
        </header>
        {loading ? <p role="status" className="mt-5 rounded-2xl bg-canvas p-4 text-sm font-bold text-copy">Memuat materi...</p> : null}
        {loadError ? <div className="mt-4 min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert"><div className="flex items-start gap-2"><AlertTriangle className="mt-1 size-5 shrink-0 text-amber-800" aria-hidden="true" /><p className="min-w-0 text-sm font-bold leading-6 text-amber-900 [overflow-wrap:anywhere]">{loadError}</p></div><button type="button" onClick={reload} disabled={locked} className="button-secondary mt-3 min-w-12 rounded-full px-3 py-2 text-sm"><RefreshCw className="size-4" aria-hidden="true" /> Coba lagi</button></div> : null}
        {!loading && !loadError && documents.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/50 p-5 text-center">
            <FolderOpen className="mx-auto size-8 text-cobalt" aria-hidden="true" />
            <h3 className="mt-3 text-base font-black text-ink">Belum ada materi</h3>
          </div>
        ) : null}
        {documents.length > 0 ? (
          <ul className="mt-5 grid min-w-0 gap-3">
            {documents.map((document) => (
              <li key={document.id} className="min-w-0 rounded-[24px] border border-line bg-canvas/50 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">{document.kind === "image" ? <ImageIcon className="size-5" aria-hidden="true" /> : <FileText className="size-5" aria-hidden="true" />}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black leading-6 text-ink [overflow-wrap:anywhere]">{document.name}</h3>
                    <p className="mt-1 text-xs font-bold leading-5 text-muted [overflow-wrap:anywhere]">{document.studied ? "Sudah dipelajari" : "Siap dipelajari"}</p>
                  </div>
                </div>
                {document.segmentCount > 0 ? <SourceLinks className="mt-3" refs={[{ documentId: document.id, segmentId: "s-0001", label: "Sumber pertama" }]} /> : null}
                <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_48px] items-start gap-2">
                  <button type="button" disabled={locked} onClick={() => { if (!requestGate.current && !isGenerating) onStudy(document); }} className="button-primary min-w-0 w-full rounded-full px-3 py-3 text-sm whitespace-normal">
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Pelajari dokumen</span>
                  </button>
                  <button type="button" disabled={locked} onClick={() => void deleteDocument(document)} aria-label={`Hapus dokumen ${document.name}`} aria-busy={operation?.kind === "delete" && operation.id === document.id} className="grid size-12 place-items-center rounded-full border border-rose-200 bg-white text-danger hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                    {operation?.kind === "delete" && operation.id === document.id ? <RefreshCw className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
