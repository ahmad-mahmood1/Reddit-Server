import { MyContext } from "src/types";
import { MiddlewareFn } from "type-graphql";

export const auth: MiddlewareFn<MyContext> = async ({ context }, next) => {
  if (context.req.session.userId) {
    throw new Error("Not Authenticated");
  } else next();
};
