import { buildSchema } from "graphql";

export const typeDefs = buildSchema(`#graphql
type User {
    id: ID
    name: String
  }

  # type Game {
    
  # }


  input UserInput {
    id: ID
    username: String!
  }


  type Query {
    getAllUsers: [User]
    getUser(id: ID): User
    # getGamesByUserId(id: ID): [Game]
  }

  type Mutation {
    createUser(input: UserInput): User
  }
`);
