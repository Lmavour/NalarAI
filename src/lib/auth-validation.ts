import { z } from "zod";

export const credentialsSchema = z
  .object({
    email: z.string().min(6).max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

export function validateNewPassword(password: string) {
  const bytes = Buffer.byteLength(password, "utf8");
  return password.length >= 10 && bytes <= 72 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
