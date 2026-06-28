// TikTok auto-advance to the next video when the current one ends.
(function () {
  const state = {
    activeVideo: null,
    seen: new WeakSet(),
    iObs: null,
    mObs: null,
    tick: null,
    debugMode: false,
  };

  const log = (message, ...args) => {
    if (state.debugMode) console.log(`[AutoFlick:TikTok] ${message}`, ...args);
  };

  const byTop = (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top;

  const getAllVideos = () =>
    Array.from(document.querySelectorAll("video")).filter(
      (v) => v.readyState > 0 && v.offsetParent !== null && v.duration && Number.isFinite(v.duration)
    );

  const mostVisibleVideo = () => {
    let best = null;
    let bestArea = 0;
    for (const v of getAllVideos()) {
      const r = v.getBoundingClientRect();
      const ivw = Math.max(0, Math.min(window.innerWidth, r.right) - Math.max(0, r.left));
      const ivh = Math.max(0, Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top));
      const area = ivw * ivh;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  };

  const nextVideo = (current) => {
    if (!current) return mostVisibleVideo();
    const curTop = current.getBoundingClientRect().top;
    const vids = getAllVideos().sort(byTop);
    const next = vids.find((v) => v !== current && v.getBoundingClientRect().top > curTop + 10);
    if (!next) return vids.find((v) => v !== current);
    return next;
  };

  const scrollToVideo = (v) => {
    if (!v) {
      const nextBtn =
        document.querySelector('button[aria-label*="Next" i]') ||
        document.querySelector('[data-e2e*="next" i]') ||
        document.querySelector('a[href*="next" i]');
      if (nextBtn) nextBtn.click();
      else window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      return;
    }
    const container =
      v.closest('[data-e2e*="item" i]') ||
      v.closest('[data-e2e*="card" i]') ||
      v.closest("article,li,div");
    (container || v).scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleEnd = (v) => {
    if (!v || state.seen.has(v)) return;
    state.seen.add(v);
    setTimeout(() => {
      const nxt = nextVideo(v);
      scrollToVideo(nxt);
      setTimeout(() => {
        if (state.activeVideo !== v) state.seen.delete(v);
      }, 2000);
    }, 50);
  };

  const bindVideo = (v) => {
    if (v._ttBound) return;
    v._ttBound = true;

    v.addEventListener("ended", () => handleEnd(v), { passive: true });

    const nearEndCheck = () => {
      if (!v.duration || !Number.isFinite(v.duration)) return;
      const remaining = v.duration - v.currentTime;
      if (remaining > 0 && remaining < 0.25 && !state.seen.has(v)) handleEnd(v);
    };
    v.addEventListener("timeupdate", nearEndCheck, { passive: true });
    v.addEventListener("seeked", nearEndCheck, { passive: true });
  };

  const primeObserverTargets = () => {
    getAllVideos().forEach((v) => {
      state.iObs.observe(v);
      bindVideo(v);
    });
  };

  function start() {
    log("TikTok Autoplay initializing");

    state.iObs = new IntersectionObserver(
      (entries) => {
        let bestEntry = null;
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!bestEntry || e.intersectionRatio > bestEntry.intersectionRatio) bestEntry = e;
          }
        }
        if (bestEntry && state.activeVideo !== bestEntry.target) {
          state.activeVideo = bestEntry.target;
        } else if (!bestEntry && state.activeVideo) {
          state.activeVideo = null;
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 0.95] }
    );

    state.mObs = new MutationObserver((mutations) => {
      const relevantChange = mutations.some(
        (m) => m.addedNodes.length > 0 || m.removedNodes.length > 0
      );
      if (relevantChange) primeObserverTargets();
    });
    state.mObs.observe(document.documentElement, { childList: true, subtree: true });

    state.tick = setInterval(() => {
      const v = state.activeVideo || mostVisibleVideo();
      if (!v) return;
      const endedLike = v.ended || (v.duration && v.currentTime >= v.duration - 0.1);
      if (endedLike && (v.paused || v.loop)) handleEnd(v);
    }, 1200);

    primeObserverTargets();
  }

  function stop() {
    log("TikTok Autoplay stopping");
    try { state.iObs?.disconnect(); } catch (e) {}
    try { state.mObs?.disconnect(); } catch (e) {}
    try { clearInterval(state.tick); } catch (e) {}
    state.iObs = null;
    state.mObs = null;
    state.tick = null;
    state.activeVideo = null;
  }

  window.__RAA.register("tiktok", { start, stop });
})();
