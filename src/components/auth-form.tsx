"use client";

import { AlertCircle, ArrowRight, Check, Circle, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useRef, useState, useSyncExternalStore, useTransition } from "react";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  defaultMode: AuthMode;
  nextPath: string;
};

type AuthField = "email" | "password" | "confirmPassword";
type AuthError = { message: string; field?: AuthField };

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const subscribeToHydration = () => () => undefined;

function passwordChecks(password: string) {
  return {
    length: password.length >= 10,
    mix: /[A-Za-z]/.test(password) && /\d/.test(password),
    bytes: new TextEncoder().encode(password).length <= 72,
  };
}

function PasswordRule({ active, met, children }: { active: boolean; met: boolean; children: React.ReactNode }) {
  const status = met ? "Terpenuhi" : active ? "Belum terpenuhi" : "Belum diperiksa";
  return (
    <span role="listitem" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${met ? "bg-[#E7FAF5] text-[#087A5B]" : active ? "bg-[#FDECEF] text-[#9F1F40]" : "bg-[#EEF3F8] text-muted"}`}>
      {met ? <Check className="size-3.5" aria-hidden="true" /> : active ? <X className="size-3.5" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
      <span className="sr-only">{status}: </span>{children}
    </span>
  );
}

export function AuthForm({ defaultMode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const signupTabRef = useRef<HTMLButtonElement>(null);
  const loginTabRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const checks = passwordChecks(password);

  function switchMode(nextMode: AuthMode, focusTab = false) {
    if (isPending) return;
    setMode(nextMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    window.history.replaceState(window.history.state, "", `/auth?mode=${nextMode}&next=${encodeURIComponent(nextPath)}`);
    if (focusTab) requestAnimationFrame(() => (nextMode === "signup" ? signupTabRef : loginTabRef).current?.focus());
  }

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === "Home" ? "signup" : event.key === "End" ? "login" : mode === "signup" ? "login" : "signup";
    switchMode(nextMode, true);
  }

  function showError(message: string, field?: AuthField) {
    setError({ message, field });
    requestAnimationFrame(() => {
      if (field === "email") emailRef.current?.focus();
      if (field === "password") passwordRef.current?.focus();
      if (field === "confirmPassword") confirmPasswordRef.current?.focus();
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
      showError("Masukkan alamat email yang valid.", "email");
      return;
    }
    if (mode === "signup" && (!checks.length || !checks.mix || !checks.bytes)) {
      showError("Password belum memenuhi seluruh persyaratan.", "password");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      showError("Konfirmasi password belum sama.", "confirmPassword");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/auth/${mode === "signup" ? "register" : "login"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        const data = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          setError({ message: data?.error ?? "Permintaan belum berhasil. Coba lagi sebentar." });
          return;
        }

        router.push(nextPath);
        router.refresh();
      } catch {
        setError({ message: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi." });
      }
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-[950] leading-[1.08] tracking-[-0.04em] text-ink [overflow-wrap:anywhere]">
          {mode === "login" ? "Lanjut dari progres terakhirmu." : "Mulai jalur belajarmu."}
        </h1>
        <p className="mt-3 leading-7 text-copy">
          {mode === "login" ? "Masuk untuk mengambil streak dan level yang sudah kamu bangun." : "Daftar dengan email aktif. Hanya butuh kurang dari satu menit."}
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-2xl border border-line bg-white p-1.5" role="tablist" aria-label="Pilih mode autentikasi" onKeyDown={handleTabKeys}>
        <button ref={signupTabRef} id="signup-tab" type="button" role="tab" aria-controls="auth-panel" aria-selected={mode === "signup"} tabIndex={mode === "signup" ? 0 : -1} disabled={isPending || !hydrated} onClick={() => switchMode("signup")} className={`min-h-12 rounded-xl text-sm font-[900] transition ${mode === "signup" ? "bg-cobalt text-white shadow-[0_3px_0_#0f52cc]" : "text-copy hover:bg-ice"}`}>Daftar</button>
        <button ref={loginTabRef} id="login-tab" type="button" role="tab" aria-controls="auth-panel" aria-selected={mode === "login"} tabIndex={mode === "login" ? 0 : -1} disabled={isPending || !hydrated} onClick={() => switchMode("login")} className={`min-h-12 rounded-xl text-sm font-[900] transition ${mode === "login" ? "bg-cobalt text-white shadow-[0_3px_0_#0f52cc]" : "text-copy hover:bg-ice"}`}>Masuk</button>
      </div>

      <form id="auth-panel" role="tabpanel" aria-labelledby={`${mode}-tab`} className="mt-6" onSubmit={submit} noValidate>
        <fieldset disabled={!hydrated} className="m-0 space-y-5 border-0 p-0 disabled:cursor-wait disabled:opacity-70">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-[900] text-sapphire">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input ref={emailRef} id="email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); if (error?.field === "email") setError(null); }} aria-invalid={error?.field === "email"} aria-describedby={error?.field === "email" ? "auth-error" : undefined} placeholder="nama@contoh.com" className="h-14 w-full rounded-2xl border-2 border-line bg-white pl-12 pr-4 font-bold text-ink outline-none transition placeholder:text-muted focus:border-cobalt focus:ring-4 focus:ring-blue-100" />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-[900] text-sapphire">Password</label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input ref={passwordRef} id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(event) => { setPassword(event.target.value); if (error?.field === "password") setError(null); }} aria-invalid={error?.field === "password"} aria-describedby={[mode === "signup" ? "password-requirements" : "", error?.field === "password" ? "auth-error" : ""].filter(Boolean).join(" ") || undefined} placeholder={mode === "signup" ? "Minimal 10 karakter" : "Masukkan password"} className="h-14 w-full rounded-2xl border-2 border-line bg-white pl-12 pr-14 font-bold text-ink outline-none transition placeholder:text-muted focus:border-cobalt focus:ring-4 focus:ring-blue-100" />
            <button type="button" className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-ice hover:text-sapphire" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {mode === "signup" ? (
            <div id="password-requirements" role="list" className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold" aria-label="Persyaratan password" aria-live="polite">
              <PasswordRule active={password.length > 0} met={checks.length}>10+ karakter</PasswordRule>
              <PasswordRule active={password.length > 0} met={checks.mix}>Huruf dan angka</PasswordRule>
              <PasswordRule active={password.length > 0} met={password.length > 0 && checks.bytes}>Maks. 72 byte</PasswordRule>
            </div>
          ) : null}
        </div>

        {mode === "signup" ? (
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-[900] text-sapphire">Ulangi password</label>
            <input ref={confirmPasswordRef} id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (error?.field === "confirmPassword") setError(null); }} aria-invalid={error?.field === "confirmPassword"} aria-describedby={error?.field === "confirmPassword" ? "auth-error" : undefined} placeholder="Ketik ulang password" className="h-14 w-full rounded-2xl border-2 border-line bg-white px-4 font-bold text-ink outline-none transition placeholder:text-muted focus:border-cobalt focus:ring-4 focus:ring-blue-100" />
          </div>
        ) : null}

        {error ? (
          <div id="auth-error" role="alert" className="flex items-start gap-3 rounded-2xl border border-[#F7B4C4] bg-[#FDECEF] p-4 text-sm font-bold leading-6 text-[#9F1F40]">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            {error.message}
          </div>
        ) : null}

        <button type="submit" disabled={isPending} className="button-primary min-h-14 w-full text-base">
          {isPending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
          {isPending ? "Memproses..." : mode === "signup" ? "Buat akun & mulai" : "Masuk ke jalurku"}
          {!isPending ? <ArrowRight className="size-5" aria-hidden="true" /> : null}
        </button>
        </fieldset>
      </form>

      <p className="mt-6 text-center text-sm leading-6 text-muted">
        {mode === "signup" ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <button type="button" className="inline-flex min-h-12 items-center px-2 font-[900] text-cobalt hover:underline" onClick={() => switchMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "Masuk di sini" : "Daftar gratis"}
        </button>
      </p>
    </div>
  );
}
