export const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
export const isObjectId = (v: unknown): boolean => typeof v === "string" && OBJECT_ID_RE.test(v);
export const sameId = (a: unknown, b: unknown): boolean => a != null && b != null && String(a) === String(b);
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
