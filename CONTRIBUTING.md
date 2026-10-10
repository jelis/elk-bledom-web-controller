# Contributing

Thanks for helping out! The project is small on purpose: plain ES modules, no framework, no build step.

## Setup

```sh
npm install
npm start        # http://localhost:8000
```

Web Bluetooth only works over `https` or `localhost`, in Chrome/Edge on Android or desktop (or Bluefy on iOS).
You need a real controller to try the Bluetooth parts. Everything else is covered by unit tests.

## Before you open a pull request

```sh
npm run lint
npm run format:check   # or: npm run format
npm test
```

CI runs the same three commands.

## Guidelines

- Keep pure logic (`protocol`, `color`, `sun`, `schedule` helpers) free of DOM and Bluetooth, and add a test for it.
- Each `js/ui/*` module exposes one `initX(deps)` function and receives its dependencies as arguments. No globals.
- New files under `js/`, `css/` or `icons/` must be added to `PRECACHE` in `sw.js` (`npm test` checks this).
- Do not rename keys in `js/storage.js`, users would lose their saved settings.
- Protocol changes: update `js/protocol.js`, `test/protocol.test.js` and `docs/PROTOCOL.md`, and say in the pull request
  whether you verified the packet on real hardware.

## Reporting protocol findings

If your controller behaves differently (different on/off bytes, other effect numbers), please open an issue with the
controller name as advertised over Bluetooth and, ideally, a Bluetooth HCI snoop log or the bytes you captured.
