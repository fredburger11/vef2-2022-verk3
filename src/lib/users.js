import bcrypt from 'bcrypt';
import xss from 'xss';
import { addPageMetadata } from '../utils/addPageMetadata.js';
import { pagedQuery, query, singleQuery } from './db.js';

export async function comparePasswords(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (e) {
    console.error('Gat ekki borið saman lykilorð', e);
  }

  return false;
}

export async function findByUsername(username) {
  const q = 'SELECT * FROM users WHERE username = $1';

  try {
    const result = await query(q, [username]);

    if (result.rowCount === 1) {
      return result.rows[0];
    }
  } catch (e) {
    console.error('Gat ekki fundið notanda eftir notendnafni');
    return null;
  }

  return false;
}

export async function findById(id) {
  const q = 'SELECT * FROM users WHERE id = $1';

  try {
    const result = await query(q, [id]);

    if (result.rowCount === 1) {
      return result.rows[0];
    }
  } catch (e) {
    console.error('Gat ekki fundið notanda eftir id');
  }

  return null;
}

export async function createUser(name, username, password) {
  // Geymum hashað password!
  const hashedPassword = await bcrypt.hash(password, 11);
  const q = `
    INSERT INTO
      users (name, username, password)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  try {
    const result = await query(q, [xss(name), xss(username), hashedPassword]);
    return result.rows[0];
  } catch (e) {
    console.error('Gat ekki búið til notanda');
  }

  return null;
}

export async function listUsers(req, res) {
  const { offset = 0, limit = 10 } = req.query;

  const users = await pagedQuery(
    `SELECT
        id, name, username, admin
      FROM
        users
      ORDER BY id ASC`,
    [],
    { offset, limit },
  );

  const usersWithPage = addPageMetadata(
    users,
    req.path,
    { offset, limit, length: users.items.length },
  );

  return res.json(usersWithPage);
}

export async function listUser(userId) {
  const user = await singleQuery(
    `
      SELECT
        id, name, username, admin
      FROM
        users
      WHERE
        id = $1
    `,
    [userId],
  );

  if (!user) {
    return null;
  }

  return user;
}
