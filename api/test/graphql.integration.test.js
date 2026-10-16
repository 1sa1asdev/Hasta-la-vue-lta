import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import { pool } from '../src/db/client.js';
import { yoga } from '../src/graphql/server.js';

const request = async (query, variables, token) => {
  const response = await yoga.fetch(
    new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    }),
  );

  assert.equal(response.status, 200);
  return response.json();
};

test('executes GraphQL queries and an authenticated mutation against PostgreSQL', async () => {
  assert.ok(config.databaseUrl, 'DATABASE_URL is required for integration tests');
  assert.ok(config.jwtSecret, 'JWT_SECRET is required for integration tests');

  let createdTourId;
  try {
    const guidesResult = await request(`
      query {
        guides { id slug title lengthKm }
      }
    `);
    assert.deepEqual(guidesResult.errors, undefined);
    assert.ok(guidesResult.data.guides.length > 0);

    const selectedGuide = guidesResult.data.guides[0];
    const guideResult = await request(
      `query Guide($slug: String!) { guide(slug: $slug) { id slug title } }`,
      { slug: selectedGuide.slug },
    );
    assert.deepEqual(guideResult.errors, undefined);
    assert.equal(guideResult.data.guide.id, selectedGuide.id);

    const toursResult = await request(`
      query {
        tours(limit: 2) {
          id
          title
          startedAt
          distanceM
          user { id displayName role createdAt }
          guide { id slug }
        }
      }
    `);
    assert.deepEqual(toursResult.errors, undefined);
    assert.ok(toursResult.data.tours.length > 0);
    assert.ok(!JSON.stringify(toursResult).includes('password_hash'));

    const selectedTour = toursResult.data.tours[0];
    const tourResult = await request(
      `query Tour($id: ID!) { tour(id: $id) { id title distanceM } }`,
      { id: selectedTour.id },
    );
    assert.deepEqual(tourResult.errors, undefined);
    assert.equal(tourResult.data.tour.id, selectedTour.id);

    const token = jwt.sign(
      { id: selectedTour.user.id, role: selectedTour.user.role },
      config.jwtSecret,
    );
    const mutationResult = await request(
      `
        mutation CreateTour($input: CreateTourInput!) {
          createTour(input: $input) {
            id
            title
            distanceM
            user { id }
            guide { id }
          }
        }
      `,
      {
        input: {
          title: `GraphQL integration ${process.pid}`,
          guideId: selectedGuide.id,
          startedAt: '2026-10-16',
          distanceM: 1234,
          notes: 'temporary integration test row',
        },
      },
      token,
    );

    assert.deepEqual(mutationResult.errors, undefined);
    assert.equal(mutationResult.data.createTour.user.id, selectedTour.user.id);
    assert.equal(mutationResult.data.createTour.guide.id, selectedGuide.id);
    createdTourId = mutationResult.data.createTour.id;
  } finally {
    if (createdTourId) {
      await pool.query('DELETE FROM tours WHERE id = $1', [createdTourId]);
    }
    await pool.end();
  }
});
