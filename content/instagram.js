// Instagram Reels auto-advance.
(function () {
  const LOG = (...args) => console.log("[AutoFlick:Reels]", ...args);

  // How close to the end of a clip counts as finished.
  const END_SLACK = 0.3;
  // Ignore further end-of-reel triggers for this long after an advance.
  const COOLDOWN_MS = 1200;
  // How often we re-check which reel is on screen.
  const POLL_MS = 250;
  // How much of a reel has to be on screen for it to count as the one being
  // watched. Measured against the video's own box, not the viewport: reels are
  // portrait and on a wide window fill barely a quarter of it.
  const ACTIVE_VISIBILITY = 0.6;

  let boundVideo = null; // the one reel we listen to
  let boundSrc = ""; // its source, so a recycled element re-arms
  let armed = false; // true until we have advanced for this reel
  let lastTime = 0; // previous currentTime, for loop-wrap detection
  let lastAdvanceAt = -Infinity;
  let poll = null;

  function isReelsPage() {
    return /^\/reels(\/|$)|^\/reel\//.test(location.pathname);
  }

  function getNextButton() {
    return document.querySelector('[aria-label="Navigate to next Reel"]');
  }

  function srcOf(video) {
    return video.currentSrc || video.src || "";
  }

  // Instagram keeps around seven preloaded reels in the DOM at once, stacked
  // below the fold and every one of them reporting as visible, so "every
  // <video> on the page" is far too wide a net: a preloaded clip reaching its
  // end would flick the feed while the user is still watching something else.
  // Pick out the single reel that is actually on screen.
  function getActiveVideo() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let best = null;
    let bestArea = 0;

    for (const video of document.querySelectorAll("video")) {
      const r = video.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const area = iw * ih;
      if (area > bestArea && area >= r.width * r.height * ACTIVE_VISIBILITY) {
        bestArea = area;
        best = video;
      }
    }

    // Null mid-scroll, when no reel is settled enough to claim: callers keep
    // watching whichever one they already had.
    return best;
  }

  function bind(video) {
    if (video === boundVideo && srcOf(video) === boundSrc) return;

    unbind();
    boundVideo = video;
    boundSrc = srcOf(video);
    armed = true;
    lastTime = video.currentTime;
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTimeupdate);
    LOG("watching reel", { duration: video.duration });
  }

  function unbind() {
    if (!boundVideo) return;
    boundVideo.removeEventListener("ended", onEnded);
    boundVideo.removeEventListener("timeupdate", onTimeupdate);
    boundVideo = null;
    boundSrc = "";
  }

  // One advance per reel, and never two in quick succession. Both `ended` and
  // the closing `timeupdate` land at the end of a clip, and every extra click
  // of the next button costs the user a whole reel.
  function advance(reason) {
    if (!armed || !isReelsPage()) return;
    if (performance.now() - lastAdvanceAt < COOLDOWN_MS) return;
    // Mid-scroll, or if the bound reel has drifted off screen, sit tight.
    if (boundVideo !== getActiveVideo()) return;

    armed = false;
    lastAdvanceAt = performance.now();

    const btn = getNextButton();
    if (btn) {
      btn.click();
    } else {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    }
    LOG("advanced", reason);
  }

  function finished(video) {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
    return video.ended || video.duration - video.currentTime <= END_SLACK;
  }

  function onEnded() {
    if (this !== boundVideo) return;
    advance("ended");
  }

  function onTimeupdate() {
    if (this !== boundVideo || this.seeking) return;

    // Reels restart rather than stop, so a clip that wrapped back to the start
    // finished while we were not looking and still owes us an advance.
    const wrapped =
      Number.isFinite(this.duration) &&
      this.duration > 0 &&
      lastTime >= this.duration - 1 &&
      this.currentTime < 0.5;
    lastTime = this.currentTime;

    if (wrapped || finished(this)) advance(wrapped ? "looped" : "near-end");
  }

  function sync() {
    const active = getActiveVideo();
    if (!active) return;
    bind(active);
    // Backstop for a tab that was throttled and missed its timeupdate events.
    if (!active.paused && finished(active)) advance("poll");
  }

  function start() {
    sync();
    poll = setInterval(sync, POLL_MS);
    LOG("armed");
  }

  function stop() {
    if (poll) {
      clearInterval(poll);
      poll = null;
    }
    unbind();
    armed = false;
    LOG("disarmed");
  }

  window.__RAA.register("instagram", { start, stop, shouldRun: isReelsPage });
})();
