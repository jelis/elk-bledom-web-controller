// Loaded before every test file (see the "test" script in package.json).
// Sun times are compared in local time, so the tests must not depend on the machine's time zone.
process.env.TZ = 'Europe/Berlin';
