# AutoFlick

AutoFlick is a lightweight browser extension that plays short-form video feeds hands-free. When a clip ends, it advances to the next one automatically, so you can lean back and keep watching without tapping or scrolling.

Works on:

- YouTube Shorts
- TikTok
- Instagram Reels

It runs on Chrome (and other Chromium browsers like Edge, Brave, and Opera) as well as Firefox.

## Why

The native feeds either loop the same clip forever or wait for you to swipe. AutoFlick watches the active video and triggers the platform's own "next" action the moment playback finishes, so the feed behaves more like a continuous playlist. Each site can be turned on or off independently from the toolbar popup.

## Features

- Auto-advances on YouTube Shorts, TikTok, and Instagram Reels
- Per-site toggles in a small popup, with changes applying to open tabs instantly
- Only activates on the relevant pages (Shorts and Reels stay off normal watch/feed pages)
- No tracking, no analytics, no remote calls. The only permission requested is `storage`, used to remember your toggle settings
- Cleans up after itself: turning a site off removes its observers and listeners

## Install

### From source (Chrome / Edge / Brave / Opera)

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.

### From source (Firefox)

For a temporary install that lasts until the browser restarts:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick the `manifest.json` file.

A permanent Firefox install requires a signed package, which you can build with [web-ext](https://github.com/mozilla/web-ext) and submit to addons.mozilla.org.

## Usage

Once installed, AutoFlick works on its own. Open YouTube Shorts, TikTok, or Instagram Reels and let a video finish; the next one starts automatically.

Click the AutoFlick toolbar icon to open the popup and toggle individual sites on or off. If you change a setting while a tab is already open and it does not take effect, reload that tab.

## How it works

Each supported site has its own content script that watches the currently visible video and triggers the platform's native way of moving to the next clip.

| Site            | How it advances                                  | Active only on         |
| --------------- | ------------------------------------------------ | ---------------------- |
| YouTube Shorts  | Sends an ArrowDown key event and strips the `loop` attribute so clips don't repeat | `/shorts/` pages |
| TikTok          | Scrolls the next feed item into view             | all `tiktok.com` pages |
| Instagram Reels | Clicks the "Navigate to next Reel" button, falling back to ArrowDown | `/reels` and `/reel/` pages |

A shared runtime (`content/common.js`) reads your saved preferences, starts or stops each module accordingly, and watches for single-page-app navigation so modules activate and deactivate as you move between pages. Preferences live in `chrome.storage.local` and stay in sync between the popup and the content scripts.

## Project layout

```
manifest.json          Manifest V3, shared by Chrome and Firefox
content/
  common.js            Shared runtime: preferences, lifecycle, URL watching
  shorts.js            YouTube Shorts module
  tiktok.js            TikTok module
  instagram.js         Instagram Reels module
popup/
  popup.html
  popup.css
  popup.js             Toolbar popup with per-site toggles
icons/                 16, 32, 48, and 128 px icons
```

## Contributing

Issues and pull requests are welcome. If a site changes its markup and a module stops advancing, that is the most common thing to fix, usually a selector or key event in the relevant file under `content/`.

When testing changes:

1. Edit the files.
2. Reload the extension from `chrome://extensions` (or re-load the temporary add-on in Firefox).
3. Reload the target tab and check the browser console for `[AutoFlick:...]` log lines.

## A note on the platforms

AutoFlick automates the same actions a person takes by hand and runs entirely in your own browser. Automated playback may not align with every site's terms of service. Use it for personal convenience and at your own discretion.

## License

Licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0). You are free to use, modify, and redistribute it, including commercially, as long as you give appropriate credit to the original author. See [LICENSE](LICENSE) for details.
