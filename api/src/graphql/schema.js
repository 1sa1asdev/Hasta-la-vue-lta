
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

  type Photo {
    id: ID!
    filename: String!
    width: Int!
    height: Int!
    createdAt: String!
  }

  type TourLog {
    id: ID!
    recordedAt: String!
    lat: Float!
    lon: Float!
    elevationM: Int
    heartRate: Int
    note: String
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
    photos: [Photo!]!
    logs: [TourLog!]!
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