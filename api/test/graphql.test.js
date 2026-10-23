import assert from 'node:assert/strict';
import { afterEach, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import { pool } from '../src/db/client.js';
import { yoga } from '../src/graphql/server.js';

const jwtSecret = 'graphql-test-secret';
const originalQuery = pool.query;

const guide = {
  id: 1,
  slug: 'forest-loop',
  title: 'Forest Loop',
  region: 'Dalarna',
  difficulty: 'easy',
  length_km: 8.5,
  body_html: '<p>A quiet loop.</p>',
  hero_image: 'forest.jpg',
  published: true,
  updated_at: '2026-01-02T00:00:00.000Z',
};

const tour = {
  id: 7,
  user_id: 42,
  guide_id: 1,
  title: 'Morning walk',
  started_at: '2026-01-03T00:00:00.000Z',
  distance_m: 8500,
  notes: 'Cold and clear',
};

const user = {
  id: 42,
  display_name: 'Alex Example',
  role: 'member',
  created_at: '2026-01-01T00:00:00.000Z',
};

const request = (query, variables, token) =>
  yoga.fetch(
    new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    }),
  );

const json = async (response) => {
  assert.equal(response.status, 200);
  return response.json();
};

before(() => {
  config.jwtSecret = jwtSecret;
});

afterEach(() => {
  pool.query = originalQuery;
});

test('returns guides, a guide, tours with a limit, and a tour', async () => {
  pool.query = async (sql, params) => {
    if (sql.includes('FROM guides WHERE slug')) return { rows: [guide] };
    if (sql.includes('FROM tours WHERE id')) return { rows: [tour] };
    if (sql.includes('FROM guides ORDER BY id')) return { rows: [guide] };
    if (sql.includes('FROM guides WHERE id')) return { rows: [guide] };
    if (sql.includes('FROM tours ORDER BY started_at')) {
      assert.deepEqual(params, [1]);
      return { rows: [tour] };
    }
    if (sql.includes('FROM users WHERE id')) return { rows: [user] };
    throw new Error(`Unexpected query: ${sql}`);
  };

  const result = await json(
    await request(`
      query {
        guides { id slug lengthKm bodyHtml heroImage updatedAt }
        guide(slug: "forest-loop") { title }
        tours(limit: 1) { id title distanceM user { displayName } guide { slug } }
        tour(id: "7") { id title startedAt notes }
      }
    `),
  );

  assert.deepEqual(result.errors, undefined);
  assert.deepEqual(result.data.guides[0], {
    id: '1',
    slug: 'forest-loop',
    lengthKm: 8.5,
    bodyHtml: '<p>A quiet loop.</p>',
    heroImage: 'forest.jpg',
    updatedAt: '2026-01-02T00:00:00.000Z',
  });
  assert.equal(result.data.guide.title, 'Forest Loop');
  assert.deepEqual(result.data.tours[0], {
    id: '7',
    title: 'Morning walk',
    distanceM: 8500,
    user: { displayName: 'Alex Example' },
    guide: { slug: 'forest-loop' },
  });
  assert.deepEqual(result.data.tour, {
    id: '7',
    title: 'Morning walk',
    startedAt: '2026-01-03T00:00:00.000Z',
    notes: 'Cold and clear',
  });
});

test('does not expose password_hash on User', async () => {
  const result = await json(
    await request(`
      query {
        __type(name: "User") { fields { name } }
      }
    `),
  );

  assert.deepEqual(result.data.__type.fields.map(({ name }) => name), [
    'id',
    'displayName',
    'role',
    'createdAt',
  ]);
});

test('rejects createTour without authentication', async () => {
  const result = await json(
    await request(`
      mutation {
        createTour(input: {
          title: "New tour"
          startedAt: "2026-01-04"
          distanceM: 1200
        }) { id }
      }
    `),
  );

  assert.equal(result.data, null);
  assert.equal(result.errors[0].extensions.code, 'UNAUTHENTICATED');
  assert.equal(pool.query, originalQuery);
});

test('creates a tour for the authenticated JWT user', async () => {
  let insertParams;
  pool.query = async (sql, params) => {
    assert.match(sql, /INSERT INTO tours/);
    insertParams = params;
    return { rows: [tour] };
  };

  const token = jwt.sign({ id: 42, email: 'alex@example.com', role: 'member' }, jwtSecret);
  const result = await json(
    await request(
      `
        mutation CreateTour($input: CreateTourInput!) {
          createTour(input: $input) { id title distanceM }
        }
      `,
      {
        input: {
          title: 'New tour',
          startedAt: '2026-01-04',
          distanceM: 1200,
          notes: 'Sunny',
        },
      },
      token,
    ),
  );

  assert.deepEqual(result.errors, undefined);
  assert.deepEqual(result.data.createTour, {
    id: '7',
    title: 'Morning walk',
    distanceM: 8500,
  });
  assert.deepEqual(insertParams, [42, null, 'New tour', '2026-01-04', 1200, 'Sunny']);
});

test('returns partial data when a nested non-null field fails', async () => {
  pool.query = async (sql) => {
    if (sql.includes('FROM tours WHERE id')) return { rows: [tour] };
    if (sql.includes('FROM users WHERE id')) return { rows: [] };
    if (sql.includes('FROM guides ORDER BY id')) return { rows: [guide] };
    throw new Error(`Unexpected query: ${sql}`);
  };

  const result = await json(
    await request(`
      query {
        tour(id: "7") { id user { displayName } }
        guides { slug }
      }
    `),
  );

  assert.equal(result.data.tour, null);
  assert.deepEqual(result.data.guides, [{ slug: 'forest-loop' }]);
  assert.equal(result.errors[0].path.join('.'), 'tour.user');
});

test('counts photos for a tour from the batched photos loader', async () => {
  pool.query = async (sql, params) => {
    if (sql.includes('FROM tours WHERE id')) return { rows: [tour] };
    if (sql.includes('FROM photos')) {
      assert.match(sql, /tour_id = ANY/);
      assert.deepEqual(params, [[tour.id]]);
      return {
        rows: [
          { id: 1, tour_id: tour.id },
          { id: 2, tour_id: tour.id },
          { id: 3, tour_id: tour.id },
        ],
      };
    }
    throw new Error(`Unexpected query: ${sql}`);
  };

  const result = await json(
    await request(`
      query {
        tour(id: "7") { photoCount }
      }
    `),
  );

  assert.deepEqual(result.errors, undefined);
  assert.equal(result.data.tour.photoCount, 3);
});
