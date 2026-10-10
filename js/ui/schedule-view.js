/** Schedule cards "Licht an" / "Licht aus". The markup lives in index.html (data-alarm="0|1"). */
import { $, haptic, toast } from './dom.js';
import { LOCATION, OFFSET_STEP_MIN } from '../config.js';
import { ALARM_SLOTS, ALL_DAYS, DAYS_LONG, DAYS_SHORT, daySummary, formatMinutes } from '../schedule.js';

const EVENT_LABEL = { sunset: 'Sonnenuntergang', sunrise: 'Sonnenaufgang' };

const signedMinutes = (offset) => (offset > 0 ? '+' : '−') + Math.abs(offset);
const offsetText = (offset) =>
  offset === 0 ? 'genau zur Sonnenzeit' : `${Math.abs(offset)} Min. ${offset < 0 ? 'davor' : 'danach'}`;

/**
 * @param {object} deps
 * @param {import('../schedule.js').Schedule} deps.schedule
 */
export function initScheduleView({ schedule }) {
  const cards = ALARM_SLOTS.map((_, slot) => {
    const card = document.querySelector(`[data-alarm="${slot}"]`);
    const part = (role) => card.querySelector(`[data-role="${role}"]`);
    const view = {
      enabled: part('enabled'),
      body: part('body'),
      summary: part('summary'),
      time: part('time'),
      offset: part('offset'),
      place: part('place'),
      dayButtons: [],
    };

    DAYS_SHORT.forEach((name, bit) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-button';
      button.textContent = name;
      button.disabled = true;
      button.setAttribute('aria-label', DAYS_LONG[bit]);
      button.onclick = () => {
        haptic();
        schedule.toggleDay(slot, bit);
      };
      part('days').appendChild(button);
      view.dayButtons.push(button);
    });

    view.enabled.addEventListener('change', () => schedule.setEnabled(slot, view.enabled.checked));
    part('earlier').onclick = () => {
      haptic();
      schedule.shiftOffset(slot, -OFFSET_STEP_MIN);
    };
    part('later').onclick = () => {
      haptic();
      schedule.shiftOffset(slot, OFFSET_STEP_MIN);
    };
    return view;
  });

  function render() {
    schedule.alarms.forEach((alarm, slot) => {
      const view = cards[slot];
      const minutes = schedule.minutes(slot);
      const eventLabel = EVENT_LABEL[ALARM_SLOTS[slot].event];
      const offsetShort = alarm.offset ? ` ${signedMinutes(alarm.offset)}` : '';

      view.enabled.checked = alarm.enabled;
      view.body.hidden = !alarm.enabled;
      view.dayButtons.forEach((button, bit) => button.classList.toggle('on', Boolean(alarm.days & (1 << bit))));

      if (!alarm.enabled) {
        view.summary.textContent = 'Aus';
      } else if (!(alarm.days & ALL_DAYS)) {
        view.summary.textContent = 'Bitte Tage wählen';
      } else {
        const offsetLong = offsetShort && `${offsetShort} Min.`;
        const when = minutes === null ? 'heute keine Sonnenzeit' : `${formatMinutes(minutes)} Uhr`;
        view.summary.textContent = `${daySummary(alarm.days)} · ${eventLabel}${offsetLong} · ${when}`;
      }

      view.time.innerHTML = `${minutes === null ? '–' : formatMinutes(minutes)}<small>${eventLabel}${offsetShort}</small>`;
      view.offset.textContent = offsetText(alarm.offset);
      view.place.textContent = LOCATION.name + (minutes === null ? ' · heute keine Sonnenzeit' : '');
    });
  }

  schedule.subscribe(render);
  render();

  $('clockNow').onclick = () => {
    haptic();
    schedule.sendClock();
    toast('Uhr der Kette gestellt');
  };
}
