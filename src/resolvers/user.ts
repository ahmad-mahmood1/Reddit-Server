import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { MyContext } from "src/types";
import argon from "argon2";
import { User } from "../entities/User";
import { RequiredEntityData } from "@mikro-orm/core";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  error?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResovler {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { fork, req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    const user = await fork.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async registration(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { fork }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        error: [
          {
            field: "username",
            message: "Username must be greater than 2 characters",
          },
        ],
      };
    }

    if (options.password.length <= 3) {
      return {
        error: [
          {
            field: "password",
            message: "Password must be greater than 3 characters",
          },
        ],
      };
    }

    const hashedPassword = await argon.hash(options.password);
    const user = fork.create(User, {
      username: options.username,
      password: hashedPassword,
    } as RequiredEntityData<User>);

    try {
      await fork.persistAndFlush(user);
    } catch (err) {
      if (err.code === "23505" || err.detail.includes("already exists")) {
        return {
          error: [
            { field: "username", message: "This username already exists" },
          ],
        };
      }
    }
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { fork, req }: MyContext
  ): Promise<UserResponse> {
    const user = await fork.findOne(User, { username: options.username });

    if (!user) {
      return {
        error: [{ field: "username", message: "Username does not exist" }],
      };
    }
    const verify = await argon.verify(user.password, options.password);

    if (!verify) {
      return {
        error: [{ field: "password", message: "Incorrect password" }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }
}
