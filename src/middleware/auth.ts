import { MyContext } from "src/types";
import { MiddlewareFn } from "type-graphql";

export const auth: MiddlewareFn<MyContext> = async ({ context }, next) => {
  if (!context.req.signedCookies.uid) {
    throw new Error("Not Authenticated");
  }
  return next();
};
