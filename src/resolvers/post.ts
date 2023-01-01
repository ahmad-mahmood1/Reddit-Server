import { RequiredEntityData } from "@mikro-orm/core";
import { MyContext } from "src/types";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Post } from "../entities/Post";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { fork }: MyContext): Promise<Post[]> {
    return fork.find(Post, {});
  }

  @Query(() => Post, { nullable: true })
  post(
    @Arg("id") id: number,
    @Ctx() { fork }: MyContext
  ): Promise<Post | null> {
    return fork.findOne(Post, { id });
  }

  @Mutation(() => Post)
  async createPost(
    @Arg("title") title: string,
    @Ctx() { fork }: MyContext
  ): Promise<Post> {
    const post = fork.create(Post, { title } as RequiredEntityData<Post>);
    await fork.persistAndFlush(post);
    return post;
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title") title: string,
    @Ctx() { fork }: MyContext
  ): Promise<Post | null> {
    const post = await fork.findOne(Post, { id });
    if (!post) {
      return null;
    }
    if (typeof title !== "undefined") {
      post.title = title;
      await fork.persistAndFlush(post);
    }
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(
    @Arg("id") id: number,
    @Ctx() { fork }: MyContext
  ): Promise<boolean> {
    await fork.nativeDelete(Post, { id });
    return true;
  }
}
