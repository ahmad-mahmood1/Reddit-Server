import { Options } from "@mikro-orm/postgresql";
import path from "path";
import { __prod__ } from "./constants";

const mikroConfig: Options = {
  migrations: {
    path: path.join(__dirname, "./migrations"),
    glob: "!(*.d).{js,ts}",
  },
  entities: [path.join(__dirname, "./entities")], // path to our JS entities (dist), relative to `baseDir`
  dbName: "tracker",
  user: "postgres",
  password: "postgres",
  type: "postgresql",
  debug: !__prod__,
};

export default mikroConfig;
