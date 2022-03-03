import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { catchErrors } from '../lib/catch-errors.js';
import {
  createEvent, deleteEvent, deleteRegistration, listEvent, listEventByName, listEvents,
  listRegistered,
  register,
  updateEvent
} from '../lib/db.js';
import { validationCheck } from '../lib/helpers.js';
import { addUserIfAuthenticated } from '../lib/passport.js';
import { listUser, listUsers } from '../lib/users.js';
import {
  atLeastOneBodyValueValidator, pagingQuerystringValidator, sanitizationMiddleware, validateResourceExists,
  xssSanitizationMiddleware
} from '../lib/validation.js';
import { readFile } from '../utils/fs-helpers.js';

export const indexRouter = express.Router();

function returnResource(req, res) {
  return res.json(req.resource);
}

indexRouter.get('/', async (req, res) => {
  const path = dirname(fileURLToPath(import.meta.url));
  const indexJson = await readFile(join(path, './index.json'));
  res.json(JSON.parse(indexJson));
});

async function indexRoute(req, res) {
  const events = await listEvents();

  res.render('index', {
    title: 'Viðburðasíðan',
    admin: false,
    events,
  });
}

async function eventRoute(req, res, next) {
  const { name } = req.body;
  console.log(name);
  const { id } = req.body;
  console.log(id);
  //const { slug } = req.params;
  //const event = await listEvent(slug);
  const event = await listEvent(id);

  //return res.json(event);

  if (!event) {
    return next();
  }

  const registered = await listRegistered(event.id);

  return res.render('event', {
    //title: `${event.name} — Viðburðasíðan`,
    event,
    registered,
    errors: [],
    data: {},
  });
}

async function eventRegisteredRoute(req, res) {
  const events = await listEvents();

  res.render('registered', {
    title: 'Viðburðasíðan',
    events,
  });
}

async function registerRoute(req, res) {
  const { username, comment } = req.body;
  const { slug } = req.params;
  const event = await listEventByName(slug);

  const registered = await register({
    username,
    comment,
    event: event.id,
  });

  return res.status(201).json(registered);

};



/*
indexRouter.get('/', catchErrors(indexRoute));
indexRouter.get('/:slug', catchErrors(eventRoute));
indexRouter.post(
  '/:slug',
  registrationValidationMiddleware('comment'),
  xssSanitizationMiddleware('comment'),
  catchErrors(validationCheck),
  sanitizationMiddleware('comment'),
  catchErrors(registerRoute)
);
indexRouter.get('/:slug/thanks', catchErrors(eventRegisteredRoute));
*/

//##########  verkefni 3 ######################



// rdy
indexRouter.get(
  '/users',
  //requireAdmin,
  pagingQuerystringValidator,
  validationCheck,
  listUsers,
);
// rdy
indexRouter.get(
  '/users/:id',
  //requireAdmin,
  validateResourceExists(listUser),
  validationCheck,
  returnResource,
);
// rdy
indexRouter.get(
  '/events',
  pagingQuerystringValidator,
  validationCheck,
  catchErrors(listEvents),
);

// rdy
indexRouter.get(
  '/events/:id',
  addUserIfAuthenticated,
  validateResourceExists(listEvent),
  validationCheck,
  returnResource,
);
// rdy
indexRouter.post(
  '/events',
  //requireAuthentication,
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  validationCheck,
  catchErrors(createEvent),

);

indexRouter.post(
  '/events/:id/register',
  //requireAuthentication,
  //registrationValidationMiddleware,
  //xssSanitizationMiddleware('comment'),
  //sanitizationMiddleware('comment'),
  //validationCheck,
  catchErrors(registerRoute),
);
// þarf að laga
indexRouter.patch(
  '/events/:id',
  //requireAdmin??( Vantar fall sem annaðhvort hleypir admin eða 'eiganda' events)
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  atLeastOneBodyValueValidator(['name', 'description']),
  validationCheck,
  catchErrors(updateEvent),
  returnResource,
);

indexRouter.delete(
  '/events/:id',
  //requireAdmin??( Vantar fall sem annaðhvort hleypir admin eða 'eiganda' events)
  validateResourceExists(listEvent),
  catchErrors(validationCheck),
  catchErrors(deleteEvent), // þetta þarf að laga
);

indexRouter.delete(
  '/events/:id/register',
  //requireAuthentication,
  validateResourceExists(registerRoute),
  catchErrors(validationCheck),
  catchErrors(deleteRegistration)
);

