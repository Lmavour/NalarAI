"use client";

import { ArrowRight, LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/brand";
import { InstallAppButton } from "@/components/install-app-button";

const LANDING_LINKS = [
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#fitur", label: "Fitur" },
  { href: "#liga", label: "Liga" },
] as const;

function subscribeToHydration() {
  return () => {};
}

export function LandingNavigation() {
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };

    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  return (
    <nav ref={navRef} className="page-shell relative flex min-h-[72px] items-center justify-between gap-3" aria-label="Navigasi utama">
      <Brand />

      <div className="hidden items-center gap-7 md:flex">
        {LANDING_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="inline-flex min-h-12 items-center text-sm font-extrabold text-copy transition hover:text-cobalt">
            {link.label}
          </a>
        ))}
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <InstallAppButton compact className="hidden lg:inline-flex" />
        <Link href="/auth?mode=login" className="button-quiet min-h-12 px-3">Masuk</Link>
        <Link href="/auth?mode=signup" className="button-primary min-h-12 px-4 lg:px-5">Mulai belajar</Link>
      </div>

      <button
        ref={triggerRef}
        type="button"
        disabled={!hydrated}
        className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-white text-sapphire shadow-[0_3px_0_#D8E6F3] disabled:opacity-70 md:hidden"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="landing-mobile-menu"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open ? (
        <div id="landing-mobile-menu" className="safe-popover absolute top-[calc(100%+8px)] z-50 rounded-[22px] border border-line bg-white p-3 shadow-float md:hidden">
          <div className="grid gap-1">
            {LANDING_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 text-sm font-[900] text-copy hover:bg-ice hover:text-cobalt">
                {link.label}
              </a>
            ))}
          </div>
          <div className="my-2 border-t border-line" />
          <InstallAppButton className="w-full" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/auth?mode=login" className="button-secondary min-h-12 px-3" onClick={() => setOpen(false)}>
              <LogIn className="size-4" aria-hidden="true" /> Masuk
            </Link>
            <Link href="/auth?mode=signup" className="button-primary min-h-12 px-3" onClick={() => setOpen(false)}>
              Mulai <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
