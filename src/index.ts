import { MikroORM } from "@mikro-orm/core";
import { Post } from "./entities/Post";

import { RequiredEntityData } from "@mikro-orm/core";
import type { PostgreSqlDriver } from "@mikro-orm/postgresql"; // or any other driver package
import mikroConfig from "./mikro-orm.config";

const main = async () => {
  const orm = await MikroORM.init<PostgreSqlDriver>(mikroConfig);
  const fork = orm.em.fork();

  const post = fork.create(Post, {
    title: "first title",
  } as RequiredEntityData<Post>);

  await fork.persistAndFlush(post);
};

main().catch((err) => {
  console.error(err);
});
