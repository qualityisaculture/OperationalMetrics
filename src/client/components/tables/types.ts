import { LiteJiraIssue } from "../../../server/JiraRequester";

export interface JiraIssueWithAggregated extends LiteJiraIssue {
  aggregatedOriginalEstimate?: number;
  aggregatedTimeSpent?: number;
  aggregatedTimeRemaining?: number;
  hasBeenRequested?: boolean;
  hasData?: boolean;
  hasChildren?: boolean | null;
}
