/** Schedule cards "Licht an" / "Licht aus". The markup lives in index.html (data-alarm="0|1"). */
import { $, haptic, toast } from './dom.js';
import { OFFSET_STEP_MIN } from '../config.js';
import { t } from '../i18n.js';
import { ALARM_SLOTS, ALL_DAYS, DAY_BITS, daySummary, formatMinutes } from '../schedule.js';

const signedMinutes = (offset) => (offset > 0 ? '+' : '−') + Math.abs(offset);
const offsetText = (offset) =>
  offset === 0
    ? t('schedule.offsetNone')
    : t(offset < 0 ? 'schedule.offsetBefore' : 'schedule.offsetAfter', { min: Math.abs(offset) });

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
      dayButtons: [],
    };

    DAY_BITS.forEach((bit) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-button';
      button.textContent = t('day.short.' + bit);
      button.disabled = true;
      button.setAttribute('aria-label', t('day.long.' + bit));
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

      view.enabled.checked = alarm.enabled;
      view.body.hidden = !alarm.enabled;
      view.dayButtons.forEach((button, bit) => button.classList.toggle('on', Boolean(alarm.days & (1 << bit))));

      if (!alarm.enabled) {
        view.summary.textContent = t('schedule.summaryOff');
      } else if (!(alarm.days & ALL_DAYS)) {
        view.summary.textContent = t('schedule.pickDays');
      } else {
        const when = minutes === null ? t('schedule.noSun') : t('schedule.at', { time: formatMinutes(minutes) });
        const offset = alarm.offset ? ` (${t('schedule.offsetShort', { value: signedMinutes(alarm.offset) })})` : '';
        view.summary.textContent = `${daySummary(alarm.days)} · ${when}${offset}`;
      }

      view.time.textContent = minutes === null ? '–' : formatMinutes(minutes);
      view.offset.textContent = offsetText(alarm.offset);
    });
  }

  schedule.subscribe(render);
  render();

  $('clockNow').onclick = () => {
    haptic();
    schedule.sendClock();
    toast(t('schedule.clockSet'));
  };
}
