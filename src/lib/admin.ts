export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const admins = raw
    .split(/[\s,]+/g)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

