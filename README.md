# Lichterkette

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A web app (PWA) to control Bluetooth LED light chains with an **ELK-BLEDOM / MELK** controller, for example the
"MELK-OA21 C8" found in cheap string lights. It runs entirely in the browser: no backend, no build step, no account.

Features: on/off, white tones (Kelvin), colors, favorites, brightness, effects, a schedule that switches the light on at
sunset and off at sunrise, automatic reconnect, and installation to the home screen.

> The user interface is in German. The strings live in `js/ui/`, `js/config.js` and `index.html`.
> A German version of this README is in [README.de.md](README.de.md).

> Not affiliated with any controller vendor or shop. Use at your own risk.

## Which light chain is this for?

Built and tested for a **Bluetooth LED string light** whose **controller** advertises over Bluetooth as
**`MELK-OA21 C8`**. The light itself has no recognizable brand; the controller is what matters. It belongs to the
widely used **ELK-BLEDOM** family, which many cheap "app-controlled" LED strips, string lights and fairy lights are
built on.

Your light probably works if all of these are true:

- It is controlled with a phone app over Bluetooth (not Wi-Fi) and shows up with a name starting with `MELK`, `ELK`,
  `LEDBLE` or `Triones` in a Bluetooth scanner such as nRF Connect.
- The scanner shows the service `0xFFF0` with a writable characteristic `0xFFF3`.

Other controllers of this family may use different bytes for some commands. The commands are written for the
**MELK-OA21** profile (see [docs/PROTOCOL.md](docs/PROTOCOL.md)). If yours behaves differently, please open an issue
with the Bluetooth name of your controller.

## Status: what is verified on real hardware

Only the **color commands** are confirmed on a real MELK-OA21 C8. On/off, brightness, effects, clock sync and alarms
are derived from the community protocol notes and a Bluetooth capture of the vendor app, and are tested against
simulated bytes only. Details and the open questions are in [docs/PROTOCOL.md](docs/PROTOCOL.md). Reports from
other controllers are very welcome (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Quick start

Web Bluetooth needs `https` or `localhost`, and a supporting browser: Chrome or Edge on Android and desktop.
On iPhone, Safari does not support Web Bluetooth; use the **Bluefy** browser.

```sh
npm install        # only needed for tests, lint and formatting
npm start          # serves http://localhost:8000 (or: python3 -m http.server 8000)
```

| Command          | Purpose                                 |
| ---------------- | --------------------------------------- |
| `npm test`       | Unit tests (Node, no browser needed)    |
| `npm run lint`   | ESLint                                  |
| `npm run format` | Prettier (`format:check` only verifies) |

## Project structure

```
index.html          Markup only (no inline CSS or JS)
css/styles.css      All styles
js/
  main.js           Entry point: wires everything together
  config.js         Constants: Bluetooth UUIDs, location, tolerances, colors, effects
  protocol.js       Builds the Bluetooth packets (pure)
  bluetooth.js      Connection, auto-connect, reconnect (ChainConnection)
  write-queue.js    Write queue with spacing and "last value wins"
  schedule.js       Schedule: alarms, sun times, syncing with the controller
  sun.js            Sunrise/sunset calculation (pure, offline)
  color.js          Color conversions, Kelvin to RGB (pure)
  state.js          Small observable state (color, Kelvin, effect, power)
  storage.js        localStorage wrapper and all storage keys
  util.js
  ui/               One UI module per section of the page
test/               Unit tests (node:test)
docs/PROTOCOL.md    Bluetooth protocol and what has been verified
sw.js, manifest.json, icons/   PWA: offline cache, installability
```

## How the pieces fit together

```
          ┌──────────── main.js ────────────┐
          │                                  │
  ui/* ───┼──▶ lightState (state.js)         │   UI reads and writes the state
   │      │                                  │
   │ send │                                  │
   ▼      ▼                                  ▼
 ChainConnection (bluetooth.js) ◀── Schedule (schedule.js)
   │  └─ WriteQueue (write-queue.js)            │  alarms, clock, sun times
   ▼                                            ▼
 packets from protocol.js                 sun.js / config.js
```

- **Pure logic** (`protocol`, `color`, `sun`, helpers in `schedule`) depends on neither the DOM nor Bluetooth and is
  covered by tests.
- **`ChainConnection`** wraps Web Bluetooth. The UI only knows the events `status` and `connectionchange` and the
  method `send(bytes, key)`.
- **`ui/*`**: every module has one `initX(deps)` function, receives its dependencies as arguments and renders from
  `lightState`. There are no globals.
- **Controller state:** the controller reports nothing back. The app shows what it sent last and persists that in
  `localStorage` (keys in `storage.js`; do not rename them, users would lose their settings).

## Schedule (sun times)

The controller only knows fixed alarm times. The app calculates sunset and sunrise for `LOCATION` in
`js/config.js` and sends them as ordinary alarms ("light on" at sunset, "light off" at sunrise, optional offset and
weekdays). On open, on connect and every 30 minutes it checks whether the time differs by more than 10 minutes
(`SCHEDULE_TOLERANCE_MIN`) from what was sent last, and resends if so. The same rule applies to the controller's
clock (daylight saving changes). Sun times move by about two minutes per day in autumn and spring, so open the app
at least once a week.

**Change the location** in `js/config.js` before you deploy. The default is Frankfurt am Main.

## Deploy

Static files, any https host works.

- **Vercel:** import the repository, framework preset "Other", no build command, output directory `.`
- **GitHub Pages:** Settings → Pages → branch `main`, folder `/ (root)`

After adding files under `js/`, `css/` or `icons/`, `PRECACHE` in `sw.js` has to match (`npm test` checks this).
Bump `CACHE_VERSION` after larger changes.

## Install on a phone

- **Android (Chrome):** open the site → menu ⋮ → "Install app"
- **iPhone:** open the site in **Bluefy** and add it to the home screen

Pair in the same place where you will use the app later: an installed app and a normal browser tab remember devices
separately. The browser's device picker only appears for the first pairing. After that the app connects by itself.

## Troubleshooting: the chain is not found

1. **Close every other app that talks to the chain** (the vendor app, a second phone). The controller accepts one
   connection at a time and stops advertising while connected.
2. **Power-cycle the chain** (unplug for about 10 seconds) so it advertises again.
3. **Allow Bluetooth for the browser** (iPhone: Settings → Bluefy → Bluetooth). Do not pair it in the system
   Bluetooth settings; the browser's own picker is used.
4. Tap **"Kette nicht in der Liste? Alle Geräte zeigen"** below the connect button. It lists every Bluetooth device
   instead of only known controllers. If your chain shows up there under another name, please open an issue with that name.

## Known limitations

- Hardware verification: see the status section above.
- The weekday bit order of alarms (bit 0 = Monday) and Sunday = 7 in the clock packet are assumptions.
- Auto-connect only works while the app is open and needs a browser with `getDevices()` (Chrome). Whether Bluefy
  supports it is untested.
- The controller talks to one app at a time. Close the vendor app first.

## Credits

Protocol notes from [dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom) and
[8none1/elk-bledob](https://github.com/8none1/elk-bledob).

## License

[MIT](LICENSE)
