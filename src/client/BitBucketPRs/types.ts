import { BitBucketRepository } from "../../server/BitBucketRequester";

export interface BitBucketPRsState {
  repositories: BitBucketRepository[];
  isLoading: boolean;
  error: string | null;
  workspace: string;
}

