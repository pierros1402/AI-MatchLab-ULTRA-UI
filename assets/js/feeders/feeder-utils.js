// assets/js/feeders/feeder-utils.js

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export function safeEmit(event, payload) {
  if (typeof window.emit === "function") {
    window.emit(event, payload);
  }
}
