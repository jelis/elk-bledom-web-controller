// Loaded before every test file (see the "test" script in package.json).
// Sun times are compared in local time, so the tests must not depend on the machine's time zone.
process.env.TZ = 'Europe/Berlin';

// Texts are asserted in German, regardless of the language of the machine running the tests.
const { setLanguage } = await import('../js/i18n.js');
setLanguage('de');
