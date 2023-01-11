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
import { LessThan } from "typeorm";
import { Post } from "../entities/Post";
import { auth } from "../middleware/auth";
import { FieldError } from "./user";

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
}

@Resolver(() => Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(auth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req, dataSource }: MyContext
  ) {
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;

    const vote = await Votes.findOne({ where: { postId, userId } });

    if (vote && vote.value !== realValue) {
      await dataSource.transaction(async (tm) => {
        await tm.query(
          `
    update votes
    set value = $1
    where "postId" = $2 and "userId" = $3
        `,
          [realValue, postId, userId]
        );

        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [2 * realValue, postId]
        );
      });
    } else if (!vote) {
      await dataSource.transaction(async (tm) => {
        await tm.query(
          `
    insert into votes ("userId", "postId", value)
    values ($1, $2, $3)
        `,
          [userId, postId, realValue]
        );

        await tm.query(
          `
    update post
    set points = points + $1
    where id = $2
      `,
          [realValue, postId]
        );
      });
    }
    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Ctx() { dataSource, req }: MyContext,
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Date, { nullable: true }) cursor: Date | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    // const posts = await postRepo.find({
    //   relations: {
    //     creator: true,
    //     votes: true,
    //   },
    //   where: {
    //     ...(cursor && { createdAt: LessThan(cursor) }),
    //   },
    //   take: realLimitPlusOne,
    //   order: {
    //     createdAt: "DESC",
    //   },
    // });

    // const votes = await voteRepo.find({
    //   where: { userId: req.session.userId },
    // });
    const replacements: any[] = [realLimitPlusOne, req.session.userId];
    if (cursor) {
      replacements.push(cursor);
    }
    console.log("===  replacements", replacements);

    const posts = await dataSource.query(
      `
      select p.*, json_build_object(
        'id',u.id,
        'username',u.username,
          'email',u.email
        ) creator,
        (select votes.value from votes where "userId" = $2 and "postId" = p.id ) "voteStatus"
        from post p
        inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $3` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(
    @Arg("id", () => Int) id: number,
    @Ctx() { dataSource }: MyContext
  ): Promise<Post | null> {
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
      creatorId: req.session.userId,
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
    @Ctx() { dataSource, req }: MyContext
  ): Promise<Post | null> {
    const result = await dataSource
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
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
    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
