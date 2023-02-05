import { Votes } from "../entities/Votes";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { auth } from "../middleware/auth";
import { FieldError } from "./user";
import dataSource from "../dataSource";
import { User } from "../entities/User";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PostResponse {
  @Field(() => [FieldError], { nullable: true })
  error?: FieldError[];

  @Field(() => Post, { nullable: true })
  post?: Post;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
  @Field()
  cursor: Date;
}

@Resolver(() => Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int)
  async points(@Root() post: Post, @Ctx() { pointsLoader }: MyContext) {
    const points = await pointsLoader.load(post.id);
    return points;
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(@Root() post: Post, @Ctx() { voteLoader, req }: MyContext) {
    if (!req.signedCookies.uid) {
      return null;
    }
    const updoot = await voteLoader.load({
      postId: post.id,
      userId: req.signedCookies.uid,
    });

    return updoot ? updoot.value : null;
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(auth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: 1 | -1,
    @Ctx() { req }: MyContext
  ): Promise<PostResponse> {
    const isUpVote = value !== -1;
    const voteValue = isUpVote ? 1 : -1;

    const { uid: userId } = req.signedCookies;

    const vote = await Votes.findOne({ where: { postId, userId } });
    const post = await Post.findOne({ where: { id: postId } });

    if (!post) {
      return {
        error: [{ field: "postId", message: "Invalid Post Id" }],
      };
    }

    if (!vote) {
      const newVote = Votes.create({ value: voteValue, postId, userId });
      await newVote.save();
      return { post };
    }
    if (vote && vote.value !== voteValue) {
      vote.value = voteValue;
      await vote.save();
      return { post };
    }

    return { post };
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Date, { nullable: true }) cursor: Date | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(cursor);
    }

    const posts = await dataSource.query(
      `
    select p.*
    from post p
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );

    const realLimitPosts = posts.slice(0, realLimit);
    console.log("===  realLimitPosts", realLimitPosts);
    console.log(
      "===cursor",
      realLimitPosts[realLimitPosts.length - 1].createdAt
    );

    return {
      posts: realLimitPosts,
      hasMore: posts.length === realLimitPlusOne,
      cursor: realLimitPosts[realLimitPosts.length - 1].createdAt,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    const postRepo = dataSource.getRepository(Post);
    return postRepo.findOne({
      relations: { creator: true },
      where: {
        id,
      },
    });
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(auth)
  async createPost(
    @Ctx() { req }: MyContext,
    @Arg("options") options: PostInput
  ): Promise<PostResponse> {
    let error = [];
    if (!options.text) {
      error.push({ field: "text", message: "Post body cannot be empty" });
    }
    if (!options.title) {
      error.push({ field: "title", message: "Post title cannot be empty" });
    }

    if (!!error.length) return { error };

    const post: Post = Post.create({
      ...options,
      creatorId: req.signedCookies.uid,
    });
    await post.save();
    return { post };
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(auth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await dataSource
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.signedCookies.uid,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(auth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    await Post.delete({ id, creatorId: req.signedCookies.uid });
    return true;
  }
}
