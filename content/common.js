// Shared runtime for the AutoFlick content scripts.
// All content scripts for a given page share this same isolated JS world,
// so site scripts register themselves on the global created here.
(function () {
  if (window.__RAA) return; // guard against double injection

  const api = typeof browser !== "undefined" ? browser : chrome;

  // Default enabled state for each site module.
  const DEFAULTS = {
    youtubeShorts: true,
    tiktok: true,
    instagram: true,
  };

  const modules = new Map(); // key -> { start, stop, shouldRun, running }
  let prefs = { ...DEFAULTS };

  function evaluate() {
    for (const [key, mod] of modules) {
      const enabled = prefs[key] !== false;
      const applicable = mod.shouldRun ? !!mod.shouldRun() : true;
      const wantRunning = enabled && applicable;

      if (wantRunning && !mod.running) {
        try {
          mod.start();
          mod.running = true;
        } catch (e) {
          console.error("[RAA] start failed for", key, e);
        }
      } else if (!wantRunning && mod.running) {
        try {
          mod.stop();
        } catch (e) {
          console.error("[RAA] stop failed for", key, e);
        }
        mod.running = false;
      }
    }
  }

  // Register a site module. Called by the per-site content scripts.
  function register(key, { start, stop, shouldRun } = {}) {
    if (typeof start !== "function" || typeof stop !== "function") {
      throw new Error("[RAA] register requires start() and stop() for " + key);
    }
    modules.set(key, { start, stop, shouldRun, running: false });
    evaluate();
  }

  // Watch for SPA URL changes (YouTube/TikTok/Instagram are single-page apps).
  let lastHref = location.href;
  function watchUrl() {
    const check = () => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        evaluate();
      }
    };
    setInterval(check, 700);
    window.addEventListener("popstate", check, true);
    window.addEventListener("yt-navigate-finish", check, true);
  }

  // Load preferences, then react to changes made from the popup.
  api.storage.local.get("sites", (res) => {
    prefs = { ...DEFAULTS, ...((res && res.sites) || {}) };
    evaluate();
  });

  api.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.sites) return;
    prefs = { ...DEFAULTS, ...(changes.sites.newValue || {}) };
    evaluate();
  });

  watchUrl();

  window.__RAA = { register, DEFAULTS };
})();
