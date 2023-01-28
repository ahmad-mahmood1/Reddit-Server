import { DataSource } from "typeorm";
import { __prod__ } from "./constants";

const dataSource = new DataSource({
  entities: ["dist/entities/*js"], // path to our JS entities (dist), relative to `baseDir`
  // database: "tracker",
  database: "lkgbgwqy",
  username: "lkgbgwqy",
  password: "moaxbqS22F8sD3ACB4tGVF6AC4TJTNS3",
  type: "postgres",
  logging: !__prod__,
  host: "trumpet.db.elephantsql.com",
  synchronize: true,
  migrations: ["dist/migrations/*.js"],
  migrationsTableName: "migrations",
  extra: {
    max: 1,
  },
});

export default dataSource;
