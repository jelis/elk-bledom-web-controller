/**
 * Sunrise and sunset using the Almanac for Computers method (NOAA approximation, accuracy about 2 minutes).
 * Works completely offline.
 */

const RAD = Math.PI / 180;
/** Zenith angle of sunrise/sunset (sun's center 50' below the horizon: radius + refraction). */
const ZENITH = 90.833;

/**
 * @typedef {'sunrise' | 'sunset'} SunEvent
 * @typedef {{ lat: number, lon: number }} Coordinates
 */

/**
 * Time of sunrise or sunset on the calendar day of `date` (the device's local day).
 * @param {Date} date
 * @param {Coordinates} coords latitude (north +) and longitude (east +) in degrees
 * @param {SunEvent} event
 * @returns {Date | null} `null` if the sun does not rise or set on this day (polar day/night)
 */
export function sunEventTime(date, { lat, lon }, event) {
  const rising = event === 'sunrise';
  const startOfYear = Date.UTC(date.getFullYear(), 0, 0);
  const startOfDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((startOfDay - startOfYear) / 864e5);

  // approximate time of the event in days
  const lngHour = lon / 15;
  const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;

  // mean anomaly and true longitude of the sun
  const meanAnomaly = 0.9856 * t - 3.289;
  const trueLongitude = mod(
    meanAnomaly + 1.916 * Math.sin(meanAnomaly * RAD) + 0.02 * Math.sin(2 * meanAnomaly * RAD) + 282.634,
    360,
  );

  // right ascension, brought into the same quadrant as the longitude, in hours
  let rightAscension = mod(Math.atan(0.91764 * Math.tan(trueLongitude * RAD)) / RAD, 360);
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  // declination and hour angle
  const sinDec = 0.39782 * Math.sin(trueLongitude * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosHourAngle = (Math.cos(ZENITH * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
  if (cosHourAngle > 1 || cosHourAngle < -1) return null;
  const hourAngle = (rising ? 360 - Math.acos(cosHourAngle) / RAD : Math.acos(cosHourAngle) / RAD) / 15;

  // local mean time → UTC
  const localMeanTime = hourAngle + rightAscension - 0.06571 * t - 6.622;
  const utcHours = mod(localMeanTime - lngHour, 24);
  return new Date(startOfDay + utcHours * 3600e3);
}

/**
 * Time of the event in minutes since midnight (device local time, rounded to whole minutes).
 * @param {Date} date
 * @param {Coordinates} coords
 * @param {SunEvent} event
 * @returns {number | null}
 */
export function sunEventMinutes(date, coords, event) {
  const time = sunEventTime(date, coords, event);
  if (!time) return null;
  return Math.round(time.getHours() * 60 + time.getMinutes() + time.getSeconds() / 60);
}

/** Modulo that stays in the range [0, n) for negative numbers too. */
function mod(value, n) {
  return ((value % n) + n) % n;
}
