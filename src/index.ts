import { MikroORM } from "@mikro-orm/core";

import type { PostgreSqlDriver } from "@mikro-orm/postgresql"; // or any other driver package
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import { MyContext } from "src/types";
import { buildSchema } from "type-graphql";
import { __prod__ } from "./constants";
import mikroConfig from "./mikro-orm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResovler } from "./resolvers/user";

const main = async () => {
  const orm = await MikroORM.init<PostgreSqlDriver>(mikroConfig);
  await orm.getMigrator().up();
  const fork = orm.em.fork();

  const app = express();

  const corsConfig = {
    credentials: true,
    origin: "http://localhost:3000",
  };
  app.use(cors(corsConfig));

  let RedisStore = require("connect-redis")(session);

  // redis@v4
  let redis = new Redis();
  // redisClient.connect().catch(console.error);

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
      resolvers: [HelloResolver, PostResolver, UserResovler],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ fork, req, res, redis }),
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
