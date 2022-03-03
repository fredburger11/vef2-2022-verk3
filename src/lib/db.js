import { readFile } from 'fs/promises';
import pg from 'pg';
import xss from 'xss';
import { addPageMetadata } from '../utils/addPageMetadata.js';
import { toPositiveNumberOrDefault } from '../utils/toPositiveNumberOrDefault.js';
import { slugify } from './slugify.js';
const SCHEMA_FILE = './sql/schema.sql';
const DROP_SCHEMA_FILE = './sql/drop.sql';

const { DATABASE_URL: connectionString, NODE_ENV: nodeEnv = 'development' } =
  process.env;

if (!connectionString) {
  console.error('vantar DATABASE_URL í .env');
  process.exit(-1);
}

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development
// mode, á heroku, ekki á local vél
const ssl = nodeEnv === 'production' ? { rejectUnauthorized: false } : false;

const pool = new pg.Pool({ connectionString, ssl });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

export async function query(q, values = []) {
  let client;
  try {
    client = await pool.connect();
  } catch (e) {
    console.error('unable to get client from pool', e);
    return null;
  }

  try {
    const result = await client.query(q, values);
    return result;
  } catch (e) {
    if (nodeEnv !== 'test') {
      console.error('unable to query', e);
    }
    return null;
  } finally {
    client.release();
  }
}

export async function singleQuery(_query, values = []) {
  const result = await query(_query, values);

  if (result.rows && result.rows.length === 1) {
    return result.rows[0];
  }

  return null;
}

export async function pagedQuery(
  sqlQuery,
  values = [],
  { offset = 0, limit = 10 } = {},
) {
  const sqlLimit = values.length + 1;
  const sqlOffset = values.length + 2;
  const q = `${sqlQuery} LIMIT $${sqlLimit} OFFSET $${sqlOffset}`;

  const limitAsNumber = toPositiveNumberOrDefault(limit, 10);
  const offsetAsNumber = toPositiveNumberOrDefault(offset, 0);

  const combinedValues = values.concat([limitAsNumber, offsetAsNumber]);

  const result = await query(q, combinedValues);

  return {
    limit: limitAsNumber,
    offset: offsetAsNumber,
    items: result.rows,
  };
}

export async function deleteQuery(_query, values = []) {
  const result = await query(_query, values);

  return result.rowCount;
}

export async function createSchema(schemaFile = SCHEMA_FILE) {
  const data = await readFile(schemaFile);

  return query(data.toString('utf-8'));
}

export async function dropSchema(dropFile = DROP_SCHEMA_FILE) {
  const data = await readFile(dropFile);

  return query(data.toString('utf-8'));
}
/*
export async function createEvent({ name, slug, description } = {}) {
  const q = `
    INSERT INTO events
      (name, slug, description)
    VALUES
      ($1, $2, $3)
    RETURNING id, name, slug, description;
  `;
  const values = [name, slug, description];
  const result = await query(q, values);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}
*/

export async function createEvent(req, res) {
  const { name, description } = req.body;

  const slug = slugify(name);
  try {
    //
    const newEvent = await singleQuery(
      `
      INSERT INTO
        events (name, slug, description)
      VALUES
        ($1, $2, $3)
      RETURNING name, slug, description;
      `,
      [xss(name), xss(slug), xss(description)],
    );

    return res.status(201).json(newEvent);

  } catch (e) {
    console.error(`unable to create event "${name}"`, e);
  }

  return res.status(500).json(null);

}

export async function updateEvent(req, res) {
  const { id: id } = req.params;
  const { name, description } = req.body;

  const slug = slugify(name);
  try {
    const newEvent = await singleQuery(
      `
      UPDATE events
        SET
          name = $1,
          slug = $2,
          description = $3,
          updated = CURRENT_TIMESTAMP
      WHERE
        id = $4
      RETURNING id, name, slug, description;
    `,
      [xss(name), xss(slug), xss(description), id],
    );

    return res.status(201).json(newEvent);

  } catch (e) {
    console.error(`unable to update event "${name}"`, e);
  }

  return res.status(500).json(null);

}

export async function register({ name, comment, event } = {}) {
  const q = `
    INSERT INTO registrations
      (name, comment, event)
    VALUES
      ($1, $2, $3)
    RETURNING
      id, name, comment, event;
  `;
  const values = [name, comment, event];
  const result = await query(q, values);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

export async function listEvents(req, res) {
  const { offset = 0, limit = 10 } = req.query;

  const events = await pagedQuery(
    `SELECT
        id, name, slug, description, created, updated
      FROM
        events
      ORDER BY id ASC`,
    [],
    { offset, limit },
  );

  const eventsWithPage = addPageMetadata(
    events,
    req.path,
    { offset, limit, length: events.items.length },
  );

  return res.json(eventsWithPage);
}

export async function listEvent(id) {
  const q = `
    SELECT
      id, name, slug, description, created, updated
    FROM
      events
    WHERE id = $1
  `;

  const result = await query(q, [id]);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}


// TODO gætum fellt þetta fall saman við það að ofan
export async function listEventByName(slug) {
  const q = `
    SELECT
      id, name, slug, description, created, updated
    FROM
      events
    WHERE name = $1
  `;

  const result = await query(q, [slug]);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

export async function listRegistered(event) {
  const q = `
    SELECT
      id, name, comment
    FROM
      registrations
    WHERE event = $1
  `;

  const result = await query(q, [event]);

  if (result) {
    return result.rows;
  }

  return null;
};

export async function end() {
  await pool.end();
}
// þetta þarf að laga
export async function deleteEvent(req, res) {
  const { id } = req.params;

  try {
    const deletionRowCount = await deleteQuery(
      'DELETE FROM events WHERE id = $1;',
      [id],
    );

    if (deletionRowCount === 0) {
      return res.status(404).end();
    }

    return res.status(200).json({});
  } catch (e) {
    console.error(`unable to delete event "${id}"`, e);
  }

  return res.status(500).json(null);
}

export async function deleteRegistration(req, res) {
  const { event } = req.params;
  const { id } = req.user;

  try {
    await singleQuery(
      `
      DELETE FROM registrations WHERE id = $1 AND name = $2
      `,
      [event, id],
    );

    return res.status(200).json({});
  } catch (e) {
    // logger.error(`unable to delete state of "${event}" for user "${id}"`, e);
  }

  return res.status(500).json(null);
}
