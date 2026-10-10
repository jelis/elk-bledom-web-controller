/** Collapsed "Effekte" section: 22 built-in programs of the controller plus speed. */
import { $, haptic } from './dom.js';
import { EFFECT_BASE, EFFECT_COUNT } from '../config.js';
import * as protocol from '../protocol.js';
import { initEffectSpeed } from './slider.js';

/** @param {{ chain: any, state: typeof import('../state.js').lightState, storage: any }} deps */
export function initEffects({ chain, state, storage }) {
  const container = $('modes');
  const buttons = Array.from({ length: EFFECT_COUNT }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(index + 1);
    button.disabled = true;
    button.setAttribute('aria-label', 'Effekt ' + (index + 1));
    button.onclick = () => {
      haptic();
      state.set({ effect: index });
      chain.send(protocol.effect(EFFECT_BASE + index));
    };
    container.appendChild(button);
    return button;
  });

  state.subscribe(({ effect }) =>
    buttons.forEach((button, index) => button.classList.toggle('active', index === effect)),
  );

  return initEffectSpeed({ chain, storage, toPacket: protocol.effectSpeed });
}
