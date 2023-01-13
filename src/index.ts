// import { ApolloServer } from "apollo-server-express";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import bodyParser from "body-parser";
import http from "http";
import { buildSchema } from "type-graphql";
import { __prod__ } from "./constants";
import dataSource from "./dataSource";
import { PostResolver } from "./resolvers/post";
import { UserResovler } from "./resolvers/user";
import { createPointsLoader } from "./utils/createPointsLoader";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";
const main = async () => {
  await dataSource.initialize(); //typeorm initalization

  const app = express();
  const httpServer = http.createServer(app);

  const corsConfig = {
    credentials: true,
    origin: "http://localhost:3000",
  };

  let RedisStore = require("connect-redis")(session);
  let redis = new Redis();

  app.use(
    session({
      name: "qid",
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "lax", //need to read on this
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: "keyboard cat",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResovler],
      validate: false,
    }),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apolloServer.start();

  app.use(
    cors(corsConfig),
    bodyParser.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => ({
        req,
        res,
        redis,
        userLoader: createUserLoader(),
        voteLoader: createVoteLoader(),
        pointsLoader: createPointsLoader(),
      }),
    })
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );
};

main().catch((err) => {
  console.error(err);
});
