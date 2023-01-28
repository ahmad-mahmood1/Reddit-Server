import { Response } from "express";
import { __prod__ } from "../constants";

export const setUserCookie = (res: Response, userId: number) => {
  const options = {
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
    httpOnly: true,
    samesite: __prod__ ? "none" : "lax",
    secure: __prod__ ? true : false,
  };

  res.cookie("uid", userId, options);
};
