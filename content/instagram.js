// Instagram Reels auto-advance.
(function () {
  let tracked = new WeakSet();
  let observer = null;

  function isReelsPage() {
    return /^\/reels(\/|$)|^\/reel\//.test(location.pathname);
  }

  function getNextButton() {
    return document.querySelector('[aria-label="Navigate to next Reel"]');
  }

  function goToNext() {
    if (!isReelsPage()) return;
    const btn = getNextButton();
    if (btn) {
      btn.click();
    } else {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    }
  }

  function onEnded() {
    goToNext();
  }

  function onTimeupdate() {
    if (this.duration > 0 && this.currentTime >= this.duration - 0.3) {
      goToNext();
    }
  }

  function attachListeners() {
    document.querySelectorAll("video").forEach((video) => {
      if (tracked.has(video)) return;
      tracked.add(video);
      video.addEventListener("ended", onEnded);
      video.addEventListener("timeupdate", onTimeupdate);
    });
  }

  function start() {
    attachListeners();
    observer = new MutationObserver(attachListeners);
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("[AutoFlick] Instagram Reels active.");
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    document.querySelectorAll("video").forEach((video) => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTimeupdate);
    });
    tracked = new WeakSet();
    console.log("[AutoFlick] Instagram Reels stopped.");
  }

  window.__RAA.register("instagram", { start, stop, shouldRun: isReelsPage });
})();
