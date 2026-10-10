/** Status line, connection indicator and notice for unsupported browsers. */
import { $ } from './dom.js';

/** @param {string} text */
export function setStatus(text) {
  $('status').textContent = text;
}

/** Enables or locks all controls, depending on the connection. @param {boolean} connected */
export function setConnectedUi(connected) {
  $('dot').classList.toggle('on', connected);
  document.body.classList.toggle('connected', connected);
  // Everything in .lock as well as on/off and "Uhr stellen" is only usable while connected
  document
    .querySelectorAll('.lock :is(button, input), #powerSeg button, #clockNow')
    .forEach((element) => (element.disabled = !connected));
  const button = $('connect');
  button.textContent = connected ? 'Trennen' : 'Verbinden';
  button.classList.toggle('ghost', connected);
}

/** @param {string} html */
function showMessage(html) {
  const element = $('msg');
  element.innerHTML = html;
  element.classList.add('show');
}

/** Shows a notice if the browser does not support Web Bluetooth or the page is not served over https. */
export function showSupportProblem() {
  if (!('bluetooth' in navigator)) {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    showMessage(
      isIos
        ? '<b>Dieser Browser unterstützt kein Web Bluetooth.</b><br>Auf dem iPhone funktioniert Safari dafür nicht. Öffne diese Seite im kostenlosen Browser <b>Bluefy</b> (App Store).'
        : '<b>Dieser Browser unterstützt kein Web Bluetooth.</b><br>Nutze Chrome oder Edge (Android / Desktop) und öffne die Seite über <b>https</b>.',
    );
  } else if (!window.isSecureContext) {
    showMessage('<b>Web Bluetooth braucht https.</b> Öffne die Seite über die https-Adresse.');
  } else {
    return false;
  }
  $('connect').disabled = true;
  $('connectAll').disabled = true;
  return true;
}
