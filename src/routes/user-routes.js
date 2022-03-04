import express from 'express';
import jwt from 'jsonwebtoken';
import { catchErrors } from '../lib/catch-errors.js';
import { validationCheck } from '../lib/helpers.js';
import { jwtOptions, requireAuthentication, tokenOptions } from '../lib/passport.js';
import {
  createUser, findById, findByUsername
} from '../lib/users.js';
import {
  nameValidator, passwordValidator,
  sanitizationMiddleware, usernameAndPaswordValidValidator,
  usernameDoesNotExistValidator, usernameValidator,
  xssSanitizationMiddleware
} from '../lib/validation.js';

export const userRouter = express.Router();

async function registerRoute(req, res) {
  const { name, username, password = '' } = req.body;

  const result = await createUser(name, username, password);

  delete result.password;

  return res.status(201).json(result);
}

async function loginRoute(req, res) {
  const { username } = req.body;

  const user = await findByUsername(username);

  const payload = { id: user.id };
  const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
  delete user.password;

  return res.json({
    user,
    token,
    expiresIn: tokenOptions.expiresIn,
  });
}

async function currentUserRoute(req, res) {
  const { user: { id } = {} } = req;
  const user = await findById(id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  delete user.password;

  return res.json(user);
}
/*
POST:
> curl -vH "Content-Type: application/json" -d
'{
    "name":"Kari",
    "username":"KariKlariSmari",
    "password":"KariKlariSmari"
}'
http://localhost:3000/users/register/
{
    "id": 2,
    "name": "Kari",
    "username": "KariKlariSmari",
    "admin": false
}
*/
userRouter.post(
  '/users/register',
  nameValidator,
  usernameValidator,
  passwordValidator,
  usernameDoesNotExistValidator,
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  validationCheck,
  catchErrors(registerRoute),
);
/*
POST:
> curl -vH "Content-Type: application/json" -d
'{
    "username":"KariKlariSmari",
    "password":"KariKlariSmari"
}'
http://localhost:3000/users/login/
{
    "user": {
        "id": 2,
        "name": "Kari",
        "username": "KariKlariSmari",
        "admin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNjQ2MzYyODQyLCJleHAiOjE2NDYzNjY0NDJ9.RrFma_i260jCiQZK-mGug95q85jEk-mRPwSoDH4exus",
    "expiresIn": 3600
}
*/
userRouter.post(
  '/users/login',
  usernameValidator,
  passwordValidator,
  usernameAndPaswordValidValidator,
  xssSanitizationMiddleware('comment'),
  sanitizationMiddleware('comment'),
  validationCheck,
  catchErrors(loginRoute),
);

/*
GET:
> curl http://localhost:3000/users/me/
{
    "id": 2,
    "name": "Kari",
    "username": "KariKlariSmari",
    "admin": false
}
*/
userRouter.get(
  '/users/me',
  requireAuthentication,
  validationCheck,
  catchErrors(currentUserRoute),
);
