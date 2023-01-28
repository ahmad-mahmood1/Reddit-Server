import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";
import { MyContext } from "src/types";
import { buildSchema } from "type-graphql";
import { __prod__ } from "./constants";
import dataSource from "./dataSource";
import { PostResolver } from "./resolvers/post";
import { UserResovler } from "./resolvers/user";
import { createPointsLoader } from "./utils/createPointsLoader";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";
import * as dotenv from "dotenv";

const main = async () => {
  dotenv.config();
  await dataSource.initialize();
  const app = express();
  app.set("trust proxy", 1);
  const corsConfig = {
    credentials: true,
    origin: process.env.CORS_ORIGIN,
  };
  app.use(cors(corsConfig));

  let RedisStore = require("connect-redis")(session);
  let redis = new Redis({
    host: process.env.REDIS_HOST as string,
    port: parseInt(process.env.REDIS_PORT as string) as number,
    password: process.env.REDIS_PASSWORD as string,
  });

  app.use(
    session({
      name: "qid",
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "none", //need to read on this
        secure: true,
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET as string,
      resave: false,
    })
  );

  console.log("===  __prod__", __prod__);

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
