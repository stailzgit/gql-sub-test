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

const PORT = 4000;
const pubsub = new PubSub();

let users = [
  { id: 1, name: "Stas", age: 12 },
  { id: 2, name: "Vova", age: 20 },
];

// Schema definition
const typeDefs = `#graphql

  type User {
    id: ID,
    name: String,
    age: Int
  }

  type Query {
    currentNumber: Int
    getAllUsers: [User!]!
    getUser(id: ID!): User
  }

  type Mutation {
    updateAgeUser(id: ID!, newAge: Int!): User
  }

  type Subscription {
    numberIncremented: Int
    watchAgeUser(id: ID): User
  }
`;

// Resolver map
const resolvers = {
  Query: {
    currentNumber() {
      return currentNumber;
    },
    getAllUsers: () => {
      return users;
    },
    getUser: (id: number) => {
      return users.find((user) => user.id == id);
    },
  },
  Mutation: {
    updateAgeUser: async (_, { id, newAge }) => {
      const findUserIndex = users.findIndex((user) => user.id == id);
      const updatedUser = { ...users[findUserIndex], age: newAge };

      pubsub.publish("NEW_AGE_USER", { watchAgeUser: updatedUser });

      users[findUserIndex] = updatedUser;
      return users[findUserIndex];
    },
  },
  Subscription: {
    numberIncremented: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["NUMBER_INCREMENTED"]),
        (payload, variables) => payload.numberIncremented % 2 === 0
      ),
    },
    watchAgeUser: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["NEW_AGE_USER"]),
        (payload, variables) => payload.watchAgeUser.age % 2 === 0
      ),
    },
  },
};

// Create schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create an Express app and HTTP server; we will attach the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
const httpServer = createServer(app);

// Set up WebSocket server.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});
const serverCleanup = useServer({ schema }, wsServer);

// Set up ApolloServer.
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

// Now that our HTTP server is fully set up, actually listen.
httpServer.listen(PORT, () => {
  console.log(`🚀 Query endpoint ready at http://localhost:${PORT}/graphql`);
  console.log(
    `🚀 Subscription endpoint ready at ws://localhost:${PORT}/graphql`
  );
});

// In the background, increment a number every second and notify subscribers when it changes.
let currentNumber = 0;

function incrementNumber() {
  currentNumber++;
  pubsub.publish("NUMBER_INCREMENTED", { numberIncremented: currentNumber });
  setTimeout(incrementNumber, 1000);
}

// Start incrementing
incrementNumber();
