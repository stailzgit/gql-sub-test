import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { PubSub, withFilter } from "graphql-subscriptions";
import bodyParser from "body-parser";
import cors from "cors";
import { typeDefs } from "../typeDefs.js";
import { v4 as uuidv4 } from "uuid";

const PORT = 4000;
const pubsub = new PubSub();

const users = [
  { id: "11", name: "Stas" },
  { id: "22", name: "Vova" },
];

const games = [
  {
    id: "21",
    userId1: "11",
    userId2: "22",
    winnerId: "11",
    gameEndScore: 1,
    userScore1: 0,
    userScore2: 0,
  },
  {
    id: "22",
    userId1: "11",
    userId2: "22",
    winnerId: "22",
    gameEndScore: 2,
    userScore1: 0,
    userScore2: 0,
  },
];

const rounds = [
  { gameId: "21", id: "1", userChoice1: "0", userChoice2: "1" },
  { gameId: "21", id: "2", userChoice1: "0", userChoice2: "0" },
  { gameId: "21", id: "3", userChoice1: "0", userChoice2: "0" },
  { gameId: "21", id: "4", userChoice1: "0", userChoice2: "1" },

  { gameId: "22", id: "5", userChoice1: "0", userChoice2: "0" },
  { gameId: "22", id: "6", userChoice1: "0", userChoice2: "2" },
  { gameId: "22", id: "7", userChoice1: "0", userChoice2: "2" },
  { gameId: "22", id: "8", userChoice1: "0", userChoice2: "0" },
];

// Schema definition
// const typeDefs = `#graphql

//   type User {
//     id: ID,
//     name: String,
//     age: Int
//   }

//   type Query {
//     currentNumber: Int
//     getAllUsers: [User!]!
//     getUser(id: ID!): User
//   }

//   type Mutation {
//     updateAgeUser(id: ID!, newAge: Int!): User
//   }

//   type Subscription {
//     numberIncremented: Int
//     watchAgeUser(id: ID): User
//   }
// `;

const resolvers = {
  Query: {
    getAllUsers: () => {
      return users;
    },
    getUser: (_, { id }) => {
      return users.find((user) => user.id == id);
    },
    getGamesForUser(_, { id }) {
      return games.filter(
        ({ userId1, userId2 }) => userId1 == id || userId2 == id
      );
    },
    getRoundsInGameForUser(_, { gameId, userId }) {
      return rounds.filter(({ gameId: _gameId }) => _gameId === gameId);
    },
  },
  Mutation: {
    createGame: (_, { userId1, userId2 }) => {
      const newGame = {
        id: uuidv4(),
        userId1,
        userId2,
        winnerId: null,
        gameEndScore: 1,
        userScore1: 0,
        userScore2: 0,
      };
      games.push(newGame);
      return newGame;
    },
    createRound: (_, { gameId }) => {
      const newRound = {
        gameId: gameId,
        id: uuidv4(),
        userChoice1: null,
        userChoice2: null,
      };
      rounds.push(newRound);
      return newRound;
    },
    userSelectFigure: (_, { gameId, roundId, userId, selectedFigure }) => {
      const findRoundIndex = rounds.findIndex(
        ({ gameId: _gameId, id: _id }) => _gameId === gameId && _id === roundId
      );

      const findGameIndex = games.findIndex(({ id }) => id === gameId);

      if (games[findGameIndex].userId1 === userId) {
        rounds[findRoundIndex].userChoice1 = selectedFigure;
      } else if (games[findGameIndex].userId2 === userId) {
        rounds[findRoundIndex].userChoice2 = selectedFigure;
      }

      const { userChoice1, userChoice2 } = rounds[findRoundIndex];
      if (userChoice1 !== null && userChoice2 !== null) {
        if (userChoice1 === userChoice1) {
        }
      }

      return rounds[findRoundIndex];
    },
  },

  // Mutation: {
  //   updateAgeUser: async (_, { id, newAge }) => {
  //     const findUserIndex = users.findIndex((user) => user.id == id);
  //     const updatedUser = { ...users[findUserIndex], age: newAge };

  //     pubsub.publish("NEW_AGE_USER", { watchAgeUser: updatedUser });

  //     users[findUserIndex] = updatedUser;
  //     return users[findUserIndex];
  //   },
  // },
  // Subscription: {
  //   watchAgeUser: {
  //     subscribe: withFilter(
  //       () => pubsub.asyncIterator(["NEW_AGE_USER"]),
  //       (payload, variables) => payload.watchAgeUser.age % 2 === 0
  //     ),
  //   },
  // },
};

const whoWin = () => {};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();
app.use(
  "/graphql",
  cors<cors.CorsRequest>(),
  bodyParser.json(),
  expressMiddleware(server)
);

httpServer.listen(PORT, () => {
  console.log(`🚀 Query endpoint ready at http://localhost:${PORT}/graphql`);
  console.log(
    `🚀 Subscription endpoint ready at ws://localhost:${PORT}/graphql`
  );
});
