/**
 * Entry point: assembles the parts and wires them together.
 *
 *   storage ─┐
 *   state ───┼─▶ ui/*            UI (reads and writes `lightState`, sends via `chain`)
 *   chain ───┤                    Bluetooth connection and send queue
 *   schedule ┘                    Schedule (sun times, the chain's clock)
 */
import { LOCATION, RESYNC_INTERVAL_MS } from './config.js';
import { ChainConnection } from './bluetooth.js';
import * as protocol from './protocol.js';
import { Schedule } from './schedule.js';
import { lightState } from './state.js';
import { KEYS, storage } from './storage.js';
import { isIos } from './util.js';
import { $ } from './ui/dom.js';
import { initBrightness } from './ui/slider.js';
import { initColors } from './ui/colors.js';
import { initEffects } from './ui/effects.js';
import { initFavorites } from './ui/favorites.js';
import { initPower } from './ui/power.js';
import { initScheduleView } from './ui/schedule-view.js';
import { setConnectedUi, setStatus, showSupportProblem } from './ui/status.js';

const chain = new ChainConnection({
  storage,
  isAutoConnectEnabled: () => storage.get(KEYS.autoConnect, true),
});
const send = (bytes, key) => chain.send(bytes, key);

const schedule = new Schedule({ storage, send, coords: LOCATION });

const power = initPower({ chain, state: lightState, storage });
const colors = initColors({ chain, state: lightState, storage });
const brightness = initBrightness({ chain, storage, toPacket: protocol.brightness });
const effectSpeed = initEffects({ chain, state: lightState, storage });
initFavorites({ chain, state: lightState, storage, colors });
initScheduleView({ schedule });

/** Shows the last saved state in the UI. */
function restoreControls() {
  power.restore();
  colors.restore();
  brightness.restore();
  effectSpeed.restore();
}

// ---------- Connection ----------

chain.addEventListener('status', (event) => setStatus(event.detail));
chain.addEventListener('connectionchange', (event) => {
  const { connected } = event.detail;
  setConnectedUi(connected);
  if (connected) {
    restoreControls();
    schedule.sync();
  }
});

$('connect').addEventListener('click', () => (chain.isConnected ? chain.disconnect() : chain.connectWithPicker()));
$('connectAll').addEventListener('click', () => chain.connectWithPicker({ showAllDevices: true }));
$('connectAll').hidden = isIos(); // on iOS the picker already lists all devices

$('auto').checked = storage.get(KEYS.autoConnect, true);
$('auto').addEventListener('change', (event) => {
  storage.set(KEYS.autoConnect, event.target.checked);
  chain.setAutoConnect(event.target.checked);
});

// When returning to the app: reconnect, or (if connected) sync the clock and sun times
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (chain.isConnected) schedule.sync();
  else chain.autoConnect();
});
setInterval(() => chain.isConnected && schedule.sync(), RESYNC_INTERVAL_MS);

// ---------- Startup ----------

setConnectedUi(false);
restoreControls();
colors.restoreTab();
if (!showSupportProblem()) chain.autoConnect();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
