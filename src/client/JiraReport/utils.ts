import { LiteJiraIssue } from "../../server/JiraRequester";
import { JiraIssueWithAggregated, ProjectAggregatedData } from "./types";

// Utility function to recursively calculate aggregated estimates and time spent
export const calculateAggregatedValues = (
  issue: LiteJiraIssue
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
// TEMPORARILY DISABLED - will be reimplemented after fixing calculation logic
/*
export const calculateProjectAggregatedData = (
  projectIssues: JiraIssueWithAggregated[],
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
    }
  >
): ProjectAggregatedData => {
  let totalOriginalEstimate = 0;
  let totalTimeSpent = 0;
  let totalTimeRemaining = 0;
  let loadedWorkstreamCount = 0;

  // First, sum up all workstream aggregated values from projectIssues
  // This includes the cached aggregated values that were calculated when workstreams were first loaded
  for (const workstream of projectIssues) {
    if (
      workstream.aggregatedOriginalEstimate !== undefined &&
      workstream.aggregatedTimeSpent !== undefined &&
      workstream.aggregatedTimeRemaining !== undefined
    ) {
      totalOriginalEstimate += workstream.aggregatedOriginalEstimate;
      totalTimeSpent += workstream.aggregatedTimeSpent;
      totalTimeRemaining += workstream.aggregatedTimeRemaining;
      loadedWorkstreamCount++;
    }
  }

  // Then, also include any additional loaded workstream data that might not be in projectIssues yet
  // This handles cases where individual workstreams are loaded after the initial project load
  for (const [workstreamKey, aggregatedData] of loadedWorkstreamData) {
    // Only add if this workstream isn't already counted above
    const alreadyCounted = projectIssues.some((w) => w.key === workstreamKey);
    if (!alreadyCounted) {
      totalOriginalEstimate += aggregatedData.aggregatedOriginalEstimate;
      totalTimeSpent += aggregatedData.aggregatedTimeSpent;
      totalTimeRemaining += aggregatedData.aggregatedTimeRemaining;
      loadedWorkstreamCount++;
    }
  }

  return {
    totalOriginalEstimate,
    totalTimeSpent,
    totalTimeRemaining,
    loadedWorkstreamCount,
    totalWorkstreamCount: projectIssues.length,
  };
};
*/

// Temporary placeholder function that returns zeroed values
export const calculateProjectAggregatedData = (
  projectIssues: JiraIssueWithAggregated[],
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
    }
  >
): ProjectAggregatedData => {
  return {
    totalOriginalEstimate: 0,
    totalTimeSpent: 0,
    totalTimeRemaining: 0,
    loadedWorkstreamCount: 0,
    totalWorkstreamCount: projectIssues.length,
  };
};
