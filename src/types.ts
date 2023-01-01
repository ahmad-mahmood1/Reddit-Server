import { PostgreSqlDriver, SqlEntityManager } from "@mikro-orm/postgresql";
import { Request, Response } from "express";

export type MyContext = {
  fork: SqlEntityManager<PostgreSqlDriver>;
  req: Request;
  res: Response;
};
