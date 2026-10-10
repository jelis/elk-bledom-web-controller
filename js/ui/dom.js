/** Small DOM helpers shared by all UI modules. */

/** @param {string} id */
export const $ = (id) => document.getElementById(id);

/** Short vibration as feedback (only on devices that support it). */
export function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

let toastTimer = null;
/** Briefly shows a message at the bottom. @param {string} text */
export function toast(text) {
  const element = $('toast');
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 1800);
}

/** Fills a slider up to its current position (via the CSS variable `--p`). @param {HTMLInputElement} slider */
export function updateSliderFill(slider) {
  const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--p', percent + '%');
}
