import { LiteJiraIssue } from "../../server/JiraRequester";
import { JiraIssueWithAggregated, ProjectAggregatedData } from "./types";

// Utility function to recursively calculate aggregated estimates and time spent
export const calculateAggregatedValues = (
  issue: LiteJiraIssue
): {
  aggregatedOriginalEstimate: number;
  aggregatedTimeSpent: number;
  aggregatedTimeRemaining: number;
  hasData: boolean;
} => {
  let totalOriginalEstimate = issue.originalEstimate ?? 0;
  let totalTimeSpent = issue.timeSpent ?? 0;
  let totalTimeRemaining = issue.timeRemaining ?? 0;
  const hasData = issue.children && issue.children.length > 0;

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
    hasData,
  };
};

// Utility function to process workstream data and add aggregated values to Items
export const processWorkstreamData = (
  workstreamData: LiteJiraIssue
): JiraIssueWithAggregated => {
  const aggregatedValues = calculateAggregatedValues(workstreamData);
  return {
    ...workstreamData,
    aggregatedOriginalEstimate: aggregatedValues.aggregatedOriginalEstimate,
    aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
    aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
  };
};

// Utility function to calculate project-level aggregated data from all loaded workstreams
export const calculateProjectAggregatedData = (
  projectIssues: JiraIssueWithAggregated[],
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
      hasData: boolean;
    }
  >
): ProjectAggregatedData => {
  let totalOriginalEstimateDays = 0;
  let totalTimeSpentDays = 0;
  let totalTimeRemainingDays = 0;
  let loadedWorkstreamCount = 0;

  // Sum up all workstream aggregated values from projectIssues
  for (const workstream of projectIssues) {
    if (
      workstream.aggregatedOriginalEstimate !== undefined &&
      workstream.aggregatedTimeSpent !== undefined &&
      workstream.aggregatedTimeRemaining !== undefined
    ) {
      totalOriginalEstimateDays += workstream.aggregatedOriginalEstimate;
      totalTimeSpentDays += workstream.aggregatedTimeSpent;
      totalTimeRemainingDays += workstream.aggregatedTimeRemaining;
      loadedWorkstreamCount++;
    }
  }

  return {
    totalOriginalEstimateDays,
    totalTimeSpentDays,
    totalTimeRemainingDays,
    loadedWorkstreamCount,
    totalWorkstreamCount: projectIssues.length,
  };
};
