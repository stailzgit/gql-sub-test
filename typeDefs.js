import { buildSchema } from "graphql";

export const typeDefs = buildSchema(`#graphql
type User {
    id: ID
    name: String
  }

  type Game {
    id: ID, userId1: ID, userId2: ID, winnerId: ID, gameEndScore: 1 userScore1:Int, userScore2: Int
  }

  type Round {
    gameId: ID, id: ID, userChoice1: Int, userChoice2: Int
  }


  input UserInput {
    id: ID
    username: String!
  }


  type Query {
    getAllUsers: [User]
    getUser(id: ID): User
    getGamesForUser(id: ID): [Game]
    getRoundsInGameForUser(gameId: ID, userId: ID): [Round]
  }

  type Mutation {
    createUser(input: UserInput): User
    createGame(userId1: ID, userId2: ID): Game
    createRound(gameId: ID): Round
    userSelectFigure(gameId: ID, roundId: ID, userId: ID, selectedFigure: String): Round
  }
`);
