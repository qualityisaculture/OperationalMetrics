import {
  BitBucketRepository,
  BitBucketPullRequest,
} from "../../server/BitBucketRequester";

export interface BitBucketPRsState {
  repositories: BitBucketRepository[];
  isLoading: boolean;
  error: string | null;
  workspace: string;
  pullRequests: Array<{
    repository: BitBucketRepository;
    pullRequests: BitBucketPullRequest[];
  }>;
  isLoadingPRs: boolean;
  prsError: string | null;
  loadingRepoId: string | null; // Track which repository is currently loading PRs
  selectedRepository: BitBucketRepository | null; // Track which repository's PRs to show in modal
  prsLastUpdated: number | null; // Timestamp of when PRs were last fetched
}

