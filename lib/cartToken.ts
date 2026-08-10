const STORAGE_KEY = "jodis_gems_cart_token";

export function getCartToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}

export function resetCartToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
