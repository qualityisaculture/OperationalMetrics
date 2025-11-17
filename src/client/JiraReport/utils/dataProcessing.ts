import { JiraIssueWithAggregated } from "../types";

/**
 * Recursively processes all issues, removing empty "children" arrays from the object.
 * This should be called at the last possible point before passing data to Ant Design components.
 *
 * @param issues - Array of issues to process
 * @returns Processed array with empty children arrays removed
 */
export function processIssuesForAnt(
  issues: JiraIssueWithAggregated[]
): JiraIssueWithAggregated[] {
  return issues.map((issue) => {
    // If children is an empty array, remove it entirely
    if (Array.isArray(issue.children) && issue.children.length === 0) {
      const { children, ...issueWithoutChildren } = issue;
      // Recursively process any nested structures (though there shouldn't be any if children is empty)
      return issueWithoutChildren as JiraIssueWithAggregated;
    } else if (Array.isArray(issue.children) && issue.children.length > 0) {
      // Recursively process children
      return {
        ...issue,
        children: processIssuesForAnt(issue.children),
      };
    }

    return issue;
  });
}
