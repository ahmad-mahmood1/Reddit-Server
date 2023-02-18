import { ApolloServer } from "apollo-server-express";
import cookieParser from "cookie-parser";
import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import Redis from "ioredis";
import "reflect-metadata";
import { MyContext } from "src/types";
import { buildSchema } from "type-graphql";
import dataSource from "./dataSource";
import { PostResolver } from "./resolvers/post";
import { UserResovler } from "./resolvers/user";
import { createPointsLoader } from "./utils/createPointsLoader";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";

const main = async () => {
  dotenv.config();
  await dataSource.initialize();
  const app = express();
  const corsConfig = {
    credentials: true,
    origin: process.env.CORS_ORIGIN,
  };
  app.use(cors(corsConfig));
  let redis = new Redis({
    host: process.env.REDIS_HOST as string,
    port: parseInt(process.env.REDIS_PORT as string) as number,
    password: process.env.REDIS_PASSWORD as string,
  });

  app.use(cookieParser(process.env.SESSION_SECRET));

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResovler],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      voteLoader: createVoteLoader(),
      pointsLoader: createPointsLoader(),
    }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    "Listening on Port:4000";
  });
};

main().catch((err) => {
  console.error(err);
});
