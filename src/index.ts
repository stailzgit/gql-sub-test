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

const PORT = 4000;
const pubsub = new PubSub();

const users = [
  { id: "1", name: "Stas" },
  { id: "2", name: "Vova" },
];

const games = [
  { id: 1, userId1: 1, userId2: 2, winnerId: "1" },
  { id: 2, userId1: 1, userId2: 2, winnerId: "2" },
];

const rounds = [
  { gameId: "1", id: "1", user1: "0", user2: "1" },
  { gameId: "1", id: "2", user1: "0", user2: "0" },
  { gameId: "1", id: "3", user1: "0", user2: "0" },
  { gameId: "1", id: "4", user1: "0", user2: "1" },

  { gameId: "2", id: "5", user1: "0", user2: "0" },
  { gameId: "2", id: "6", user1: "0", user2: "2" },
  { gameId: "2", id: "7", user1: "0", user2: "2" },
  { gameId: "2", id: "8", user1: "0", user2: "0" },
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
      console.log("id", id);

      const result = users.find((user) => user.id == id);
      console.log("result", result);

      return result;
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
