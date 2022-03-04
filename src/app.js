import dotenv from 'dotenv';
import express from 'express';
import passport from './lib/login.js';
import { indexRouter } from './routes/index-routes.js';
import { userRouter } from './routes/user-routes.js';
import { cors } from './utils/cors.js';

dotenv.config();

const {
  PORT: port = 3000,
  SESSION_SECRET: sessionSecret,
  DATABASE_URL: connectionString,
} = process.env;


if (!connectionString || !sessionSecret) {
  console.error('Vantar gögn í env');
  process.exit(1);
}

const app = express();
app.use(express.json());


app.use(passport.initialize());

app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH') {
    if (
      req.headers['content-type']
      && (
        req.headers['content-type'] !== 'application/json'
        && !req.headers['content-type'].startsWith('multipart/form-data;')
      )) {
      return res.status(400).json({ error: 'body must be json or form-data' });
    }
  }
  return next();
});

/*
GET:
> curl http://localhost:3000/
{
    "register": "/users/register",
    "login": "/users/login",
    "users": "/users",
    "events": "/events"
}
*/
app.get('/', (req, res) => {
  res.json({
    register: '/users/register',
    login: '/users/login',
    users: '/users',
    events: '/events',
  });
});


app.use(userRouter);
app.use(indexRouter);

app.use(cors); // Hvað er þetta?


/* Middleware sem sér um 404 villur.
app.use((req, res) => {
  const title = 'Síða fannst ekki';
  res.status(404).render('error', { title });
});

/** Middleware sem sér um villumeðhöndlun.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const title = 'Villa kom upp';
  res.status(500).render('error', { title });
});
*/

app.use((req, res, next) => { // eslint-disable-line
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid json' });
  }

  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});
