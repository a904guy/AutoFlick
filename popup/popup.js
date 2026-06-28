const api = typeof browser !== "undefined" ? browser : chrome;

const DEFAULTS = { youtubeShorts: true, tiktok: true, instagram: true };

const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

function render(sites) {
  const prefs = { ...DEFAULTS, ...sites };
  for (const cb of checkboxes) {
    cb.checked = prefs[cb.dataset.key] !== false;
  }
}

api.storage.local.get("sites", (res) => {
  render((res && res.sites) || {});
});

for (const cb of checkboxes) {
  cb.addEventListener("change", () => {
    api.storage.local.get("sites", (res) => {
      const sites = { ...DEFAULTS, ...((res && res.sites) || {}) };
      sites[cb.dataset.key] = cb.checked;
      api.storage.local.set({ sites });
    });
  });
}
