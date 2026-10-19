
export const typeDefs = /* GraphQL */ `
  type Guide {
    id: ID!
    slug: String!
    title: String!
    region: String!
    difficulty: String!
    lengthKm: Float!
    bodyHtml: String!
    heroImage: String
    published: Boolean!
    updatedAt: String!
  }

  type User {
    id: ID!
    displayName: String!
    role: String!
    createdAt: String!
  }

  type Tour {
    id: ID!
    title: String!
    startedAt: String!
    distanceM: Int!
    notes: String
    photoCount: Int!
    user: User!
    guide: Guide
  }

  input CreateTourInput {
    title: String!
    guideId: ID
    startedAt: String!
    distanceM: Int!
    notes: String
  }

  type Query {
    guides: [Guide!]!
    guide(slug: String!): Guide
    tours(limit: Int): [Tour!]!
    tour(id: ID!): Tour
  }

  type Mutation {
    createTour(input: CreateTourInput!): Tour!
  }
`;