/** On/off switch and the color orb (tap = toggle). */
import { $, haptic } from './dom.js';
import { EFFECT_ORB_COLOR } from '../config.js';
import * as protocol from '../protocol.js';
import { KEYS } from '../storage.js';

/**
 * @param {object} deps
 * @param {import('../bluetooth.js').ChainConnection} deps.chain
 * @param {typeof import('../state.js').lightState} deps.state
 * @param {ReturnType<import('../storage.js').createStorage>} deps.storage
 */
export function initPower({ chain, state, storage }) {
  const orb = $('orb');

  const setPower = (on) => {
    haptic();
    state.set({ on });
    storage.set(KEYS.power, on);
    chain.send(on ? protocol.powerOn() : protocol.powerOff());
  };
  $('on').onclick = () => setPower(true);
  $('off').onclick = () => setPower(false);

  const toggle = () => {
    if (document.body.classList.contains('connected')) setPower(!state.get().on);
  };
  orb.addEventListener('click', toggle);
  orb.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });

  const render = ({ color, effect, on }) => {
    orb.style.setProperty('--c', effect !== null ? EFFECT_ORB_COLOR : color);
    orb.classList.toggle('fx', effect !== null);
    orb.classList.toggle('off', !on);
    $('on').classList.toggle('active', on);
    $('off').classList.toggle('active', !on);
  };
  state.subscribe(render);

  return {
    /** Loads the saved state (e.g. after connecting). */
    restore() {
      state.set({ on: storage.get(KEYS.power, true) });
    },
  };
}
