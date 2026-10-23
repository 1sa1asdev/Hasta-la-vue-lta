import { GraphQLError } from 'graphql';
import { pool } from '../db/client.js';

const unauthenticatedError = () =>
  new GraphQLError('Authentication required', {
    extensions: { code: 'UNAUTHENTICATED' },
  });

export const resolvers = {
  Query: {
    guides: async () => {
      const result = await pool.query(
        'SELECT * FROM guides ORDER BY id',
      );
      return result.rows;
    },

    guide: async (_, { slug }) => {
      const result = await pool.query(
        'SELECT * FROM guides WHERE slug = $1 LIMIT 1',
        [slug],
      );
      return result.rows[0] ?? null;
    },

    tours: async (_, { limit }) => {
      const safeLimit = Math.min(
        Math.max(Number.isInteger(limit) ? limit : 50, 0),
        200,
      );

      const result = await pool.query(
        'SELECT * FROM tours ORDER BY started_at DESC LIMIT $1',
        [safeLimit],
      );
      return result.rows;
    },

    tour: async (_, { id }) => {
      const result = await pool.query(
        'SELECT * FROM tours WHERE id = $1 LIMIT 1',
        [id],
      );
      return result.rows[0] ?? null;
    },
  },

  Guide: {
    lengthKm: (guide) => Number(guide.length_km),
    bodyHtml: (guide) => guide.body_html,
    heroImage: (guide) => guide.hero_image,
    updatedAt: (guide) => guide.updated_at,
  },

  User: {
    displayName: (user) => user.display_name,
    createdAt: (user) => user.created_at,
  },

  Tour: {
    startedAt: (tour) => tour.started_at,
    distanceM: (tour) => tour.distance_m,

    user: (tour, _args, context) => context.loaders.user.load(tour.user_id),

    guide: (tour, _args, context) => {
      if (tour.guide_id == null) return null;
      return context.loaders.guide.load(tour.guide_id);
    },

    photoCount: async (tour, _args, context) => {
      const photos = await context.loaders.photos.load(tour.id);
      return photos.length;
    },
  },

  Mutation: {
    createTour: async (_, { input }, context) => {
      if (!context.user?.id) {
        throw unauthenticatedError();
      }

      const result = await pool.query(
        `INSERT INTO tours
          (user_id, guide_id, title, started_at, distance_m, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          context.user.id,
          input.guideId ?? null,
          input.title,
          input.startedAt,
          input.distanceM,
          input.notes ?? null,
        ],
      );

      return result.rows[0];
    },
  },
};