import { $, updateSliderFill } from './dom.js';
import { KEYS } from '../storage.js';

/**
 * Percent slider (brightness, effect speed): shows the value, saves it and sends it.
 * @param {object} options
 * @param {string} options.inputId  id of the slider
 * @param {string} options.labelId  id of the percent label
 * @param {string} options.storageKey
 * @param {number} options.fallback initial value if nothing is saved
 * @param {(percent: number) => Uint8Array} options.toPacket
 * @param {{ send: (bytes: Uint8Array, key?: string) => void }} options.chain
 * @param {ReturnType<import('../storage.js').createStorage>} options.storage
 * @returns {{ restore: () => void }}
 */
function bindPercentSlider({ inputId, labelId, storageKey, fallback, toPacket, chain, storage }) {
  const input = $(inputId);
  const label = $(labelId);
  const show = (value) => {
    input.value = value;
    label.textContent = value + '%';
    updateSliderFill(input);
  };
  input.addEventListener('input', () => {
    const value = Number(input.value);
    show(value);
    storage.set(storageKey, value);
    chain.send(toPacket(value), storageKey);
  });
  return { restore: () => show(storage.get(storageKey, fallback)) };
}

/** Brightness. */
export const initBrightness = ({ chain, storage, toPacket }) =>
  bindPercentSlider({
    inputId: 'bright',
    labelId: 'brightVal',
    storageKey: KEYS.brightness,
    fallback: 100,
    toPacket,
    chain,
    storage,
  });

/** Effect speed. */
export const initEffectSpeed = ({ chain, storage, toPacket }) =>
  bindPercentSlider({
    inputId: 'speed',
    labelId: 'speedVal',
    storageKey: KEYS.effectSpeed,
    fallback: 50,
    toPacket,
    chain,
    storage,
  });
