import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { catchErrors } from '../lib/catch-errors.js';
import {
  createEventx, deleteEvent, deleteRegistration, listEvent, listEvents, register,
  updateEvent
} from '../lib/db.js';
import { validationCheck } from '../lib/helpers.js';
import { addUserIfAuthenticated, requireAdmin, requireAuthentication } from '../lib/passport.js';
import { listUser, listUsers } from '../lib/users.js';
import {
  atLeastOneBodyValueValidator,
  pagingQuerystringValidator,
  sanitizationMiddleware,
  validateResourceExists,
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

async function eventOwnerOrAdmin(req, res, next) {
  const { id } = req.params;

  const event = await listEvent(id);
  const { user } = req.user;

  if ((user.id === event.creatorid) || user.admin) {
    return next();
  }
  const error = 'insufficient authorization';

  return res.status(401).json({ error });
}

async function registerRoute(req, res) {
  const { id: slug } = req.params;
  const { comment } = req.body;
  const { user } = req.user;
  const userId = user.id;
  const event = await listEvent(slug);

  const registered = await register({
    userId,
    comment,
    event: event.id,
  });
  return res.status(201).json(registered);

};

/*
GET:
> curl http://localhost:3000/users
{
    "limit": 10,
    "offset": 0,
    "items": [
        {
            "id": 2,
            "name": "Kari",
            "username": "KariKlariSmari",
            "admin": false
        }
    ],
    "_links": {
        "self": {
            "href": "http://127.0.0.1:3000/users/?offset=0&limit=10"
        }
    }
}
*/
indexRouter.get(
  '/users',
  requireAdmin,
  pagingQuerystringValidator,
  validationCheck,
  listUsers,
);
/*
GET:
> curl http://localhost:3000/users/2
{
    "id": 2,
    "name": "Kari",
    "username": "KariKlariSmari",
    "admin": false
}
*/
indexRouter.get(
  '/users/:id',
  requireAdmin,
  validateResourceExists(listUser),
  validationCheck,
  returnResource,
);
/*
GET:
> curl http://localhost:3000/events
{
    "limit": 10,
    "offset": 0,
    "items": [
        {
            "id": 1,
            "name": "Forritarahittingur í febrúar",
            "slug": "forritarahittingur-i-februar",
            "description": "Forritarar hittast í febrúar og forrita saman eitthvað frábært.",
            "creatorid": 1,
            "created": "2022-03-04T02:53:58.238Z",
            "updated": "2022-03-04T02:53:58.238Z"
        }
    ],
    "_links": {
        "self": {
            "href": "http://127.0.0.1:3000/events?offset=0&limit=10"
        }
    }
}
*/
indexRouter.get(
  '/events',
  pagingQuerystringValidator,
  validationCheck,
  catchErrors(listEvents),
);

/*
GET:
> curl http://localhost:3000/events/1
{
    "id": 1,
    "name": "Forritarahittingur í febrúar",
    "slug": "forritarahittingur-i-februar",
    "description": "Forritarar hittast í febrúar og forrita saman eitthvað frábært.",
    "creatorid": 1,
    "created": "2022-03-04T02:53:58.238Z",
    "updated": "2022-03-04T02:53:58.238Z"
}
*/
indexRouter.get(
  '/events/:id',
  addUserIfAuthenticated,
  validateResourceExists(listEvent),
  validationCheck,
  returnResource,
);
/*
POST:
> curl -vH "Content-Type: application/json" -d
'{
    "name":"big stack pokermot",
    "description  ":"50k freeze"
}'
http://localhost:3000/events/
{
    "name": "big stack pokermot",
    "slug": "big-stack-pokermot",
    "description": "50k freeze",
    "creatorid": 2
}
*/
indexRouter.post(
  '/events',
  requireAuthentication,
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  validationCheck,
  catchErrors(createEventx),

);
/*
POST:
> curl -vH "Content-Type: application/json" -d
'{
    "comment":"Eg heiti Kari og eg kem"
}'
http://localhost:3000/events/4/register
{
    "userid": 2,
    "comment": "Eg heiti Kari og eg kem",
    "event": 4
}
*/
indexRouter.post(
  '/events/:id/register',
  requireAuthentication,
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  validationCheck,
  catchErrors(registerRoute),
);
/*
PATCH:
> curl -X PATCH -H "Content-Type: application/json" -d
'{
    {
    "name":"risa pokermot",
    "description":"100k freeze"
    }
}'
http://localhost:3000/events/4/
{
    "id": 4,
    "name": "risa pokermot",
    "slug": "risa-pokermot",
    "description": "100k freeze"
}
*/
indexRouter.patch(
  '/events/:id',
  requireAuthentication,
  eventOwnerOrAdmin,
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  atLeastOneBodyValueValidator(['name', 'description']),
  validationCheck,
  catchErrors(updateEvent),
  returnResource,
);
/*
DELETE:
> curl -X DELETE http://localhost:3000/events/4/
{}
*/
indexRouter.delete(
  '/events/:id',
  requireAuthentication,
  eventOwnerOrAdmin,
  validateResourceExists(listEvent),
  validationCheck,
  catchErrors(deleteEvent),
);
/*
DELETE:
> curl -X DELETE http://localhost:3000/events/4/register
{}
*/
indexRouter.delete(
  '/events/:id/register',
  requireAuthentication,
  validationCheck,
  catchErrors(deleteRegistration)
);

