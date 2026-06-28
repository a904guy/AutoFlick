// YouTube Shorts auto-advance.
(function () {
  const LOG = (...args) => console.log("[AutoFlick:Shorts]", ...args);

  let boundVideo = null;
  let nearEndTimer = null;
  let stallTimer = null;
  let lastTimeSeen = 0;
  let mo = null;
  let loopStripper = null;
  let loopKiller = null;

  function isShortsPage() {
    return location.pathname.startsWith("/shorts/");
  }

  function triggerDownArrow() {
    const down = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
      bubbles: true,
    });
    document.dispatchEvent(down);
  }

  function getActiveVideo() {
    const vids = Array.from(document.querySelectorAll("video"));
    if (vids.length === 0) return null;

    const vh = window.innerHeight, vw = window.innerWidth;
    const centerY = vh / 2, centerX = vw / 2;

    const scored = vids.map((v) => {
      const r = v.getBoundingClientRect();
      const ix = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const iy = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const area = ix * iy;
      const dy = Math.abs((r.top + r.bottom) / 2 - centerY);
      const dx = Math.abs((r.left + r.right) / 2 - centerX);
      const distPenalty = dx + dy;
      return { v, score: area - distPenalty };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.v || null;
  }

  function scrubLoopAttrs(v) {
    if (v.loop) v.loop = false;
    if (v.hasAttribute("loop")) v.removeAttribute("loop");
  }

  function clearPerVideoTimers() {
    if (nearEndTimer) { clearInterval(nearEndTimer); nearEndTimer = null; }
    if (stallTimer) { clearInterval(stallTimer); stallTimer = null; }
  }

  function bindVideo(v) {
    if (!v || !isShortsPage()) return;

    if (v === boundVideo) {
      scrubLoopAttrs(v);
      return;
    }

    if (boundVideo) {
      boundVideo.removeEventListener("ended", onEnded, true);
      clearPerVideoTimers();
    }

    boundVideo = v;
    scrubLoopAttrs(v);
    v.play().catch(() => {});
    v.addEventListener("ended", onEnded, true);

    let nearEndSeenAt = 0;
    clearPerVideoTimers();
    nearEndTimer = setInterval(() => {
      if (!boundVideo || !Number.isFinite(boundVideo.duration) || boundVideo.duration === 0) return;
      const ratio = boundVideo.currentTime / boundVideo.duration;
      if (ratio >= 0.985) {
        if (nearEndSeenAt === 0) nearEndSeenAt = performance.now();
        if (performance.now() - nearEndSeenAt >= 500) {
          onEnded();
        }
      } else {
        nearEndSeenAt = 0;
      }
    }, 100);

    lastTimeSeen = -1;
    stallTimer = setInterval(() => {
      if (!boundVideo) return;
      const t = boundVideo.currentTime;
      const d = boundVideo.duration;
      if (Number.isFinite(d) && d > 0 && t / d > 0.97) {
        if (t === lastTimeSeen) {
          onEnded();
        } else {
          lastTimeSeen = t;
        }
      } else {
        lastTimeSeen = t;
      }
    }, 1500);

    if (loopKiller) clearInterval(loopKiller);
    let loopKillCount = 0;
    loopKiller = setInterval(() => {
      if (!boundVideo || boundVideo !== v) { clearInterval(loopKiller); loopKiller = null; return; }
      scrubLoopAttrs(v);
      loopKillCount += 1;
      if (loopKillCount >= 20) { clearInterval(loopKiller); loopKiller = null; }
    }, 500);

    LOG("Bound to new video", { duration: v.duration });
  }

  function onEnded() {
    if (!boundVideo || !isShortsPage()) return;
    LOG("Detected end");
    clearPerVideoTimers();
    triggerDownArrow();
    setTimeout(() => bindVideo(getActiveVideo()), 600);
  }

  function start() {
    LOG("Shorts auto-advance armed");
    mo = new MutationObserver(() => {
      const v = getActiveVideo();
      if (v) bindVideo(v);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    loopStripper = setInterval(() => {
      document.querySelectorAll("video[loop]").forEach(scrubLoopAttrs);
    }, 500);

    bindVideo(getActiveVideo());
  }

  function stop() {
    LOG("Shorts auto-advance disarmed");
    if (mo) { mo.disconnect(); mo = null; }
    if (loopStripper) { clearInterval(loopStripper); loopStripper = null; }
    if (loopKiller) { clearInterval(loopKiller); loopKiller = null; }
    clearPerVideoTimers();
    if (boundVideo) {
      boundVideo.removeEventListener("ended", onEnded, true);
      boundVideo = null;
    }
  }

  window.__RAA.register("youtubeShorts", { start, stop, shouldRun: isShortsPage });
})();
