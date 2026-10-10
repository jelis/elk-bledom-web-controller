/** "White" tab (color temperature) and "Color" tab (hue, swatches, custom color). */
import { $, haptic } from './dom.js';
import { COLOR_PRESETS, KELVIN, WHITE_PRESETS } from '../config.js';
import { t } from '../i18n.js';
import { hexToHue, hexToRgb, hsvToHex, kelvinName, kelvinToRgb, rgbToHex } from '../color.js';
import * as protocol from '../protocol.js';
import { KEYS } from '../storage.js';

/**
 * @param {object} deps
 * @param {import('../bluetooth.js').ChainConnection} deps.chain
 * @param {typeof import('../state.js').lightState} deps.state
 * @param {ReturnType<import('../storage.js').createStorage>} deps.storage
 */
export function initColors({ chain, state, storage }) {
  const hueSlider = $('hue');
  const kelvinSlider = $('kelvin');
  const colorInput = $('color');

  // ---------- Setting the color ----------

  /**
   * Selects a color, saves it and sends it.
   * @param {string} hex "#rrggbb"
   * @param {boolean} [fromHueSlider] then the hue slider stays where it is
   */
  function applyColor(hex, fromHueSlider = false) {
    state.set({ color: hex, effect: null, kelvin: null });
    storage.set(KEYS.color, hex);
    storage.set(KEYS.kelvin, null);
    colorInput.value = hex;
    if (!fromHueSlider) {
      const hue = hexToHue(hex);
      if (hue !== null) hueSlider.value = hue;
    }
    chain.send(protocol.color(...hexToRgb(hex)), 'color');
  }

  /** Selects a white tone. @param {number} kelvin */
  function applyWhite(kelvin) {
    const [r, g, b] = kelvinToRgb(kelvin);
    const hex = rgbToHex(r, g, b);
    state.set({ color: hex, effect: null, kelvin });
    storage.set(KEYS.kelvin, kelvin);
    storage.set(KEYS.color, hex);
    colorInput.value = hex;
    kelvinSlider.value = kelvin;
    renderKelvinLabel(kelvin);
    chain.send(protocol.color(r, g, b), 'color');
  }

  function renderKelvinLabel(kelvin) {
    $('kval').textContent = kelvin + ' K';
    $('kname').textContent = kelvinName(kelvin);
  }

  // ---------- Tabs ----------

  /** @param {'white' | 'color'} tab */
  function showTab(tab) {
    $('paneWhite').hidden = tab !== 'white';
    $('paneColor').hidden = tab !== 'color';
    $('tabWhite').classList.toggle('active', tab === 'white');
    $('tabColor').classList.toggle('active', tab === 'color');
    storage.set(KEYS.tab, tab);
  }
  $('tabWhite').onclick = () => showTab('white');
  $('tabColor').onclick = () => showTab('color');

  // ---------- Building the controls ----------

  kelvinSlider.addEventListener('input', () => applyWhite(Number(kelvinSlider.value)));
  colorInput.addEventListener('input', () => applyColor(colorInput.value));
  hueSlider.addEventListener('input', () => applyColor(hsvToHex(Number(hueSlider.value), 1, 1), true));

  // gradient of the Kelvin slider from real color values
  const gradientStops = [];
  for (let k = KELVIN.min; k <= KELVIN.max; k += 500) {
    const [r, g, b] = kelvinToRgb(k);
    gradientStops.push(`rgb(${r},${g},${b}) ${((k - KELVIN.min) / (KELVIN.max - KELVIN.min)) * 100}%`);
  }
  kelvinSlider.style.background = `linear-gradient(90deg,${gradientStops.join(',')})`;

  const chips = WHITE_PRESETS.map(({ nameKey, kelvin }) => {
    const [r, g, b] = kelvinToRgb(kelvin);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.kelvin = String(kelvin);
    button.disabled = true;
    button.innerHTML = `<i style="background:rgb(${r},${g},${b})"></i>${t(nameKey)}`;
    button.onclick = () => {
      haptic();
      applyWhite(kelvin);
    };
    $('chips').appendChild(button);
    return button;
  });

  const swatches = COLOR_PRESETS.map(({ hex, nameKey }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.background = hex;
    button.dataset.color = hex;
    button.disabled = true;
    button.setAttribute('aria-label', t(nameKey));
    button.onclick = () => {
      haptic();
      applyColor(hex);
    };
    $('swatches').appendChild(button);
    return button;
  });

  // ---------- Displaying the selection ----------

  state.subscribe(({ color, kelvin, effect }) => {
    const plainColor = effect === null && kelvin === null;
    swatches.forEach((button) => button.classList.toggle('sel', plainColor && button.dataset.color === color));
    chips.forEach((button) =>
      button.classList.toggle(
        'active',
        effect === null && kelvin !== null && Math.abs(kelvin - Number(button.dataset.kelvin)) < 25,
      ),
    );
    $('customsw').classList.toggle('sel', plainColor && !COLOR_PRESETS.some((preset) => preset.hex === color));
  });

  return {
    applyColor,
    applyWhite,
    showTab,
    /** Loads the saved color, white tone and tab and sets the sliders accordingly. */
    restore() {
      const savedColor = storage.get(KEYS.color, null);
      let color;
      let kelvin;
      if (savedColor === null) {
        kelvin = KELVIN.default;
        color = rgbToHex(...kelvinToRgb(kelvin));
      } else {
        color = savedColor;
        kelvin = storage.get(KEYS.kelvin, null);
      }
      state.set({ color, kelvin });
      colorInput.value = color;
      if (kelvin !== null) {
        kelvinSlider.value = kelvin;
      } else {
        const hue = hexToHue(color);
        if (hue !== null) hueSlider.value = hue;
      }
      renderKelvinLabel(kelvin ?? Number(kelvinSlider.value));
    },
    restoreTab() {
      showTab(storage.get(KEYS.tab, 'white'));
    },
  };
}
