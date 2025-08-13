import { JiraIssue } from "../../server/graphManagers/JiraReportGraphManager";
import { JiraIssueWithAggregated } from "./types";

// Utility function to recursively calculate aggregated estimates and time spent
export const calculateAggregatedValues = (
  issue: JiraIssue
): {
  aggregatedOriginalEstimate: number;
  aggregatedTimeSpent: number;
  aggregatedTimeRemaining: number;
} => {
  let totalOriginalEstimate = issue.originalEstimate ?? 0;
  let totalTimeSpent = issue.timeSpent ?? 0;
  let totalTimeRemaining = issue.timeRemaining ?? 0;

  // Recursively sum up all children's values
  for (const child of issue.children) {
    const childValues = calculateAggregatedValues(child);
    totalOriginalEstimate += childValues.aggregatedOriginalEstimate;
    totalTimeSpent += childValues.aggregatedTimeSpent;
    totalTimeRemaining += childValues.aggregatedTimeRemaining;
  }

  return {
    aggregatedOriginalEstimate: totalOriginalEstimate,
    aggregatedTimeSpent: totalTimeSpent,
    aggregatedTimeRemaining: totalTimeRemaining,
  };
};

// Utility function to process workstream data and add aggregated values to Items
export const processWorkstreamData = (
  workstreamData: JiraIssue
): JiraIssueWithAggregated => {
  const aggregatedValues = calculateAggregatedValues(workstreamData);
  return {
    ...workstreamData,
    aggregatedOriginalEstimate: aggregatedValues.aggregatedOriginalEstimate,
    aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
    aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
  };
};
