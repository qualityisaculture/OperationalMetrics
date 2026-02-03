import { LiteJiraIssue } from "../../server/JiraRequester";
import {
  JiraIssueWithAggregated,
  ProjectAggregatedData,
  ChargeableNonChargeableTotals,
} from "./types";

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

/**
 * Process workstreams (from API) into JiraIssueWithAggregated with aggregated values.
 * Pure function - does not touch state. Reused when loading Projects Summary.
 */
export const processWorkstreamsToAggregated = (
  workstreams: LiteJiraIssue[]
): JiraIssueWithAggregated[] => {
  return workstreams.map((workstream) => {
    if (workstream.children && workstream.children.length > 0) {
      const aggregatedValues = calculateAggregatedValues(workstream);
      return {
        ...workstream,
        aggregatedOriginalEstimate: aggregatedValues.aggregatedOriginalEstimate,
        aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
        aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
        hasChildren: true,
      };
    }
    return {
      ...workstream,
      aggregatedOriginalEstimate: undefined,
      aggregatedTimeSpent: undefined,
      aggregatedTimeRemaining: undefined,
      hasChildren: workstream.hasChildren ?? undefined,
    };
  });
};

/**
 * Split project workstreams by chargeable vs non-chargeable (account) and sum totals.
 * Reused from the same logic as the project page filter (account includes "(Chargeable)").
 */
export const computeChargeableNonChargeableTotals = (
  projectIssues: JiraIssueWithAggregated[]
): {
  chargeable: ChargeableNonChargeableTotals;
  nonChargeable: ChargeableNonChargeableTotals;
} => {
  const toTotals = (issues: JiraIssueWithAggregated[]): ChargeableNonChargeableTotals => {
    let originalEstimate = 0;
    let timeSpent = 0;
    let timeRemaining = 0;
    issues.forEach((issue) => {
      if (issue.aggregatedOriginalEstimate !== undefined) {
        originalEstimate += issue.aggregatedOriginalEstimate;
      }
      if (issue.aggregatedTimeSpent !== undefined) {
        timeSpent += issue.aggregatedTimeSpent;
      }
      if (issue.aggregatedTimeRemaining !== undefined) {
        timeRemaining += issue.aggregatedTimeRemaining;
      }
    });
    const usagePercent =
      originalEstimate > 0 ? (timeSpent / originalEstimate) * 100 : 0;
    return {
      originalEstimate,
      timeSpent,
      usagePercent,
      timeRemaining,
    };
  };

  const chargeableIssues = projectIssues.filter((issue) =>
    (issue.account || "").includes("(Chargeable)")
  );
  const nonChargeableIssues = projectIssues.filter(
    (issue) => !(issue.account || "").includes("(Chargeable)")
  );

  return {
    chargeable: toTotals(chargeableIssues),
    nonChargeable: toTotals(nonChargeableIssues),
  };
};
