/** Status line, connection indicator and notice for unsupported browsers. */
import { t } from '../i18n.js';
import { isIos } from '../util.js';
import { $ } from './dom.js';

/** @param {string} text */
export function setStatus(text) {
  $('status').textContent = text;
}

/** Enables or locks all controls, depending on the connection. @param {boolean} connected */
export function setConnectedUi(connected) {
  $('dot').classList.toggle('on', connected);
  document.body.classList.toggle('connected', connected);
  // Everything in .lock as well as on/off and "set clock" is only usable while connected
  document
    .querySelectorAll('.lock :is(button, input), #powerSeg button, #clockNow')
    .forEach((element) => (element.disabled = !connected));
  const button = $('connect');
  button.textContent = t(connected ? 'button.disconnect' : 'button.connect');
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
    showMessage(t(isIos() ? 'support.noBluetoothIos' : 'support.noBluetooth'));
  } else if (!window.isSecureContext) {
    showMessage(t('support.needsHttps'));
  } else {
    return false;
  }
  $('connect').disabled = true;
  $('connectAll').disabled = true;
  return true;
}
