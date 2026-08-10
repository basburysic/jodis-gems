export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function venmoLink(username: string, amountCents: number, note: string): string {
  const handle = username.trim().replace(/^@/, "");
  if (!handle) return "";
  const amount = (amountCents / 100).toFixed(2);
  return `https://venmo.com/${encodeURIComponent(handle)}?txn=pay&amount=${amount}&note=${encodeURIComponent(
    note
  )}`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  paparazzi: "Paparazzi",
  bomb_party: "BOMB Party",
};
