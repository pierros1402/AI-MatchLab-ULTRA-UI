/* ============================================================
   JSON LOADER — AI MATCHLAB ULTRA FINAL
============================================================ */

export async function loadJSON(path) {
  try {
    const res = await fetch(path);

    if (!res.ok) {
      console.warn("⚠️ loadJSON: Failed to load", path);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("❌ JSON loader error:", path, err);
    return null;
  }
}
