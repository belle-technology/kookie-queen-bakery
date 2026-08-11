/**
 * iOS Safari in Private Browsing (and any browser with site data blocked)
 * throws a SecurityError the moment `localStorage` / `sessionStorage` is
 * touched. Several libraries read it at module scope, which crashed the whole
 * app with "Something went wrong". This installs an in-memory fallback so the
 * site keeps working (the cart and session just don't persist between visits).
 *
 * Must be imported before anything that touches web storage.
 */

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

function patch(key: "localStorage" | "sessionStorage") {
  try {
    const store = window[key];
    const probe = "__kq_storage_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return;
  } catch {
    try {
      Object.defineProperty(window, key, {
        configurable: true,
        value: createMemoryStorage(),
      });
    } catch {
      /* nothing else we can do */
    }
  }
}

if (typeof window !== "undefined") {
  patch("localStorage");
  patch("sessionStorage");
}

export {};
