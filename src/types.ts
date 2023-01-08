import { PostgreSqlDriver, SqlEntityManager } from "@mikro-orm/postgresql";
import { Request, Response } from "express";
import { Redis } from "ioredis";

declare module "express-session" {
  export interface SessionData {
    userId: number;
  }
}

export type MyContext = {
  fork: SqlEntityManager<PostgreSqlDriver>;
  req: Request;
  res: Response;
  redis: Redis;
};
