import DataLoader from "dataloader";
import { Votes } from "../entities/Votes";
import dataSource from "../dataSource";

export const createPointsLoader = () =>
  new DataLoader<number, number>(async (postIds) => {
    const pointsForPost: Record<number, number> = {};

    const query = dataSource
      .getRepository(Votes)
      .createQueryBuilder("vote")
      .select("SUM(vote.value)", "points")
      .addSelect('"postId"')
      .groupBy("vote.postId")
      .having("vote.postId IN (:...ids)", { ids: postIds });

    const votes = await query.getRawMany();
    votes.forEach((vote) => {
      pointsForPost[vote.postId] = parseInt(vote.points);
    });
    return postIds.map((postId) =>
      pointsForPost[postId] ? pointsForPost[postId] : 0
    );
  });
