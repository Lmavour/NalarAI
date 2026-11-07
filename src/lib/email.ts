import "server-only";
import { resolveMx } from "node:dns/promises";

const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export type EmailValidation =
  | { ok: true; email: string }
  | { ok: false; reason: "syntax" | "domain" | "temporary" };

export function normalizeAndValidateEmail(value: string): EmailValidation {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || /[^\x00-\x7F]/.test(email)) return { ok: false, reason: "syntax" };

  const parts = email.split("@");
  if (parts.length !== 2) return { ok: false, reason: "syntax" };
  const [local, domain] = parts;
  if (!local || !domain || local.length > 64 || !LOCAL_PART.test(local)) return { ok: false, reason: "syntax" };
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return { ok: false, reason: "syntax" };

  const labels = domain.split(".");
  if (labels.length < 2 || domain.length > 253 || labels.some((label) => !DOMAIN_LABEL.test(label))) {
    return { ok: false, reason: "syntax" };
  }
  const tld = labels.at(-1);
  if (!tld || tld.length < 2 || !/^[A-Za-z]+$/.test(tld)) return { ok: false, reason: "syntax" };

  return { ok: true, email };
}

export async function validateEmailDomain(email: string): Promise<EmailValidation> {
  const syntax = normalizeAndValidateEmail(email);
  if (!syntax.ok) return syntax;
  const domain = syntax.email.slice(syntax.email.lastIndexOf("@") + 1);

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS_TIMEOUT")), 4_000);
    });
    const records = await Promise.race([resolveMx(domain), timeout]);
    if (records.length === 0 || records.every((record) => !record.exchange || record.exchange === ".")) {
      return { ok: false, reason: "domain" };
    }
    return syntax;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as Error & { code?: string }).code) : "";
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENODOMAIN") return { ok: false, reason: "domain" };
    return { ok: false, reason: "temporary" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
