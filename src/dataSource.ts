import { DataSource } from "typeorm";
import { __prod__ } from "./constants";

const dataSource = new DataSource({
  entities: ["dist/entities/*js"], // path to our JS entities (dist), relative to `baseDir`
  database: "tracker",
  username: "postgres",
  password: "postgres",
  type: "postgres",
  logging: !__prod__,
  synchronize: true,
  migrations: ["dist/migrations/*.js"],
  migrationsTableName: "migrations",
});

export default dataSource;
