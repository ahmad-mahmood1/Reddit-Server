import { MikroORM } from "@mikro-orm/core";

import type { PostgreSqlDriver } from "@mikro-orm/postgresql"; // or any other driver package
import mikroConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { HelloResolver } from "./resolvers/hello";
import { buildSchema } from "type-graphql";
import { PostResolver } from "./resolvers/post";
const main = async () => {
  const orm = await MikroORM.init<PostgreSqlDriver>(mikroConfig);
  await orm.getMigrator().up();
  const fork = orm.em.fork();
  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver],
    }),
    context: () => ({ fork }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    "Listening on Port:4000";
  });
};

main().catch((err) => {
  console.error(err);
});
