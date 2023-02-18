import { Request, Response } from "express";
import { createPointsLoader } from "./utils/createPointsLoader";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";

declare module "express-session" {
  export interface SessionData {
    userId: number;
  }
}

export type MyContext = {
  req: Request;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  voteLoader: ReturnType<typeof createVoteLoader>;
  pointsLoader: ReturnType<typeof createPointsLoader>;
};
