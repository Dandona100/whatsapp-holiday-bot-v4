const { HDate, HebrewCalendar, flags } = require('@hebcal/core');

const ISRAEL_TZ = 'Asia/Jerusalem';

/**
 * Mapping from hebcal event descriptions to our EVENT_TYPES keys.
 * Each entry maps a regex (matched against the English event name) to the constant key.
 */
const HOLIDAY_MAP = [
  { pattern: /Rosh Hashana/i, type: 'rosh_hashana' },
  { pattern: /Yom Kippur/i, type: 'yom_kippur' },
  { pattern: /Sukkot/i, type: 'sukkot' },
  { pattern: /Shmini Atzeret|Simchat Torah/i, type: 'simchat_torah' },
  { pattern: /Chanukah/i, type: 'chanukah' },
  { pattern: /Purim/i, type: 'purim' },
  { pattern: /Pesach/i, type: 'pesach' },
  { pattern: /Yom HaAtzma/i, type: 'yom_haatzmaut' },
  { pattern: /Shavuot/i, type: 'shavuot' },
];

/**
 * Get the current date in Israel timezone.
 */
function getNowInIsrael() {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TZ });
  return new Date(`${str}T12:00:00`);
}

/**
 * Check if a given date is Friday (erev shabbat).
 */
function isErevShabbat(date) {
  return date.getDay() === 5;
}

/**
 * Match a hebcal event to one of our EVENT_TYPES keys.
 * Returns the type string or null.
 */
function matchHolidayType(eventDesc) {
  for (const { pattern, type } of HOLIDAY_MAP) {
    if (pattern.test(eventDesc)) return type;
  }
  return null;
}

/**
 * Check if today (Israel timezone) is erev shabbat or erev/day of a Jewish holiday.
 * Returns the EVENT_TYPES key string or null.
 */
function getCurrentEventType() {
  const today = getNowInIsrael();

  // Check holidays first (they take priority over shabbat)
  const hdate = new HDate(today);
  const events = HebrewCalendar.getHolidaysOnDate(hdate, true) || [];

  for (const ev of events) {
    const desc = ev.getDesc();
    const type = matchHolidayType(desc);
    if (type) return type;
  }

  // Check erev (day before) holidays — look at tomorrow's events
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const hdateTomorrow = new HDate(tomorrow);
  const tomorrowEvents = HebrewCalendar.getHolidaysOnDate(hdateTomorrow, true) || [];

  for (const ev of tomorrowEvents) {
    const desc = ev.getDesc();
    const evFlags = ev.getFlags();
    // Only treat as erev if tomorrow is a major holiday
    if (evFlags & (flags.MAJOR_FLAG | flags.LIGHT_CANDLES)) {
      const type = matchHolidayType(desc);
      if (type) return type;
    }
  }

  if (isErevShabbat(today)) return 'shabbat';

  return null;
}

/**
 * Return an array of upcoming events within the given number of days.
 * Each entry: { eventType, date, name }
 */
function getUpcomingEvents(days = 30) {
  const today = getNowInIsrael();
  const end = new Date(today);
  end.setDate(end.getDate() + days);

  const events = HebrewCalendar.calendar({
    start: new HDate(today),
    end: new HDate(end),
    il: true,
    noMinorFast: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
  });

  const results = [];
  const seen = new Set();

  for (const ev of events) {
    const desc = ev.getDesc();
    const type = matchHolidayType(desc);
    if (!type) continue;

    const evDate = ev.getDate().greg();
    const key = `${type}-${evDate.toISOString().slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      eventType: type,
      date: evDate,
      name: desc,
    });
  }

  return results;
}

module.exports = { getCurrentEventType, getUpcomingEvents, isErevShabbat };
