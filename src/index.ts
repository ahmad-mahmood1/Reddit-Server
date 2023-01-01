import { MikroORM } from "@mikro-orm/core";

import type { PostgreSqlDriver } from "@mikro-orm/postgresql"; // or any other driver package
import { ApolloServer } from "apollo-server-express";
import express from "express";
import session from "express-session";
import { createClient } from "redis";
import { buildSchema } from "type-graphql";
import mikroConfig from "./mikro-orm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResovler } from "./resolvers/user";
import { __prod__ } from "./constants";
import { MyContext } from "src/types";

declare module "express-session" {
  export interface SessionData {
    userId: number;
  }
}

const main = async () => {
  const orm = await MikroORM.init<PostgreSqlDriver>(mikroConfig);
  await orm.getMigrator().up();
  const fork = orm.em.fork();
  const app = express();
  app.set("trust proxy", !__prod__);
  app.set("Access-Control-Allow-Origin", "https://studio.apollographql.com");
  app.set("Access-Control-Allow-Credentials", true);

  const cors = {
    credentials: true,
    origin: "https://studio.apollographql.com",
  };

  let RedisStore = require("connect-redis")(session);

  // redis@v4
  let redisClient = createClient({ legacyMode: true });
  redisClient.connect().catch(console.error);

  app.use(
    session({
      name: "qid",
      store: new RedisStore({ client: redisClient, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "none", //need to read on this
        secure: !__prod__,
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
    context: ({ req, res }): MyContext => ({ fork, req, res }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors });

  app.listen(4000, () => {
    "Listening on Port:4000";
  });
};

main().catch((err) => {
  console.error(err);
});
