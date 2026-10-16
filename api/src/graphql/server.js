import { createSchema, createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

const schema = createSchema({
  typeDefs,
  resolvers,
});

export const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  graphiql: true,

  context: async ({ request }) => {
    const authorization = request.headers.get('authorization') ?? '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return { user: null };
    }

    try {
      const user = jwt.verify(match[1], config.jwtSecret);
      return { user };
    } catch {
      return { user: null };
    }
  },
});