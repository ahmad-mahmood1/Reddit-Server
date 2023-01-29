import argon from "argon2";
import validate from "deep-email-validator";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { v4 } from "uuid";
import { FORFOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/User";
import sendEmail from "../utils/sendEmail";
import { setUserCookie } from "../utils/setUserId";

@InputType()
class RegsiterInput {
  @Field()
  email: string;
  @Field()
  username: string;
  @Field()
  password: string;
}

@InputType()
class LoginInput {
  @Field()
  emailOrUsername: string;
  @Field()
  password: string;
}

@ObjectType()
export class FieldError {
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

@Resolver(User)
export class UserResovler {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.signedCookies.uid === user.id) {
      return user.email;
    }
    return "";
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Ctx() { redis }: MyContext,
    @Arg("email") email: string
  ) {
    const user = await User.findOneBy({ email });

    if (!user) return true;

    const token = v4();
    redis.set(
      FORFOT_PASSWORD_PREFIX + token,
      user.id,
      "EX",
      1000 * 60 * 60 * 24 * 3
    );

    const body = `<a href="http://localhost:3000/change-password/${token}">
    Reset Password</a>`;
    await sendEmail(email, body);
    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("newPassword") newPassword: string,
    @Arg("token") token: string,
    @Ctx() { redis, res }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return {
        error: [
          {
            field: "newPassword",
            message: "Password must be greater than 3 characters",
          },
        ],
      };
    }

    const userId = await redis.get(FORFOT_PASSWORD_PREFIX + token);
    if (!userId) {
      return {
        error: [
          {
            field: "token",
            message: "Token Invalid/Expired",
          },
        ],
      };
    }

    const user = await User.findOneBy({ id: parseInt(userId) });

    if (!user) {
      return {
        error: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    const hashedPassword = await argon.hash(newPassword);
    user.password = hashedPassword;

    await User.save(user);

    setUserCookie(res, user.id);

    redis.del(FORFOT_PASSWORD_PREFIX + token);
    return { user };
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    if (!req.signedCookies.uid) {
      return null;
    }

    const user = await User.findOneBy({ id: req.signedCookies.uid });
    return user;
  }

  @Mutation(() => UserResponse)
  async registeration(
    @Arg("options") options: RegsiterInput,
    @Ctx() { res }: MyContext
  ): Promise<UserResponse> {
    const emailValidation = await validate({
      email: options.email,
      validateRegex: true,
      validateMx: false,
      validateTypo: false,
      validateDisposable: false,
      validateSMTP: false,
    });
    let error = [];
    if (!emailValidation.valid) {
      error.push({ field: "email", message: "Invalid Email" });
    }

    if (options.username.length <= 2) {
      error.push({
        field: "username",
        message: "Username must be greater than 2 characters",
      });
    }

    if (options.username.includes("@")) {
      error.push({
        field: "username",
        message: "Username cannot include @",
      });
    }

    if (options.password.length <= 3) {
      error.push({
        field: "password",
        message: "Password must be greater than 3 characters",
      });
    }

    if (error.length > 0) {
      return {
        error,
      };
    }

    const hashedPassword = await argon.hash(options.password);

    const user = User.create({
      username: options.username,
      password: hashedPassword,
      email: options.email,
    });
    try {
      await user.save();
      setUserCookie(res, user.id);
      return { user };
    } catch (err) {
      if (err.code === "23505") {
        return {
          error: [
            err.detail.includes("username")
              ? { field: "username", message: "This username already exists" }
              : { field: "email", message: "This email already exists" },
          ],
        };
      }
    }
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: LoginInput,
    @Ctx() { res }: MyContext
  ): Promise<UserResponse> {
    const { emailOrUsername, password } = options;

    if (!emailOrUsername || !password) {
      return {
        error: [
          {
            field: "emailOrUsername",
            message: "Username or Email is required",
          },
        ],
      };
    }

    const user = await User.findOneBy(
      emailOrUsername.includes("@")
        ? { email: options.emailOrUsername }
        : { username: options.emailOrUsername }
    );

    if (!user) {
      return {
        error: [{ field: "emailOrUsername", message: "User does not exist" }],
      };
    }
    const verify = await argon.verify(user.password, options.password);

    if (!verify) {
      return {
        error: [{ field: "password", message: "Incorrect password" }],
      };
    }

    setUserCookie(res, user.id);

    return { user };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { res }: MyContext) {
    return new Promise((resolve) => {
      setUserCookie(res, 0, 0);
      resolve(true);
    });
  }
}
