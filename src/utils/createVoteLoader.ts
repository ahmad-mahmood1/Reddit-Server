import DataLoader from "dataloader";
import { Votes } from "../entities/Votes";

export const createVoteLoader = () =>
  new DataLoader<{ postId: number; userId?: number }, Votes | null>(
    async (keys) => {
      const votes = await Votes.find({ where: [keys as any] });
      const voteIdsToVotes: Record<string, Votes> = {};
      votes.forEach((vote) => {
        voteIdsToVotes[`${vote.userId}|${vote.postId}`] = vote;
      });

      return keys.map((key) => voteIdsToVotes[`${key.userId}|${key.postId}`]);
    }
  );
