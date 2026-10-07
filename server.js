/**
 * Entry point for cPanel / DirectAdmin "Setup Node.js App" (Phusion Passenger
 * on CloudLinux). Set this file as the application startup file.
 *
 * `next start` cannot be used there: Passenger loads one script and expects it
 * to listen on the port (or socket) it hands over in PORT. This does that with
 * the production build in .next, which deploy.sh creates.
 *
 * Local production check:  npm run build && npm run start:server
 */
const { createServer } = require('http');
const next = require('next');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Passenger passes a named pipe or socket path rather than a number; both are
// valid arguments to listen().
const port = process.env.PORT || 3001;
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res).catch((err) => {
        console.error('[server] request failed:', req.url, err);
        if (!res.headersSent) res.statusCode = 500;
        res.end('Internal Server Error');
      });
    }).listen(port, typeof port === 'number' || /^\d+$/.test(String(port)) ? hostname : undefined, () => {
      console.log(`[server] Clada Safari Bliss ready on ${port}`);
    });
  })
  .catch((err) => {
    console.error('[server] failed to start. Has `./deploy.sh` (or `npm run build`) been run?', err);
    process.exit(1);
  });
