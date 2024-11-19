import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";

export function getSize(issues: IssueInfo[], sizeMode: 'count' | 'estimate' | 'time booked') {
  if (sizeMode === 'count') {
    return issues.length;
  } else if (sizeMode === 'estimate') {
    return issues.reduce((sum, issue) => sum + (issue.timeoriginalestimate || 0)/3600/8, 0);
  } else {
    return issues.reduce((sum, issue) => sum + (issue.timespent || 0)/3600/8, 0);
  }
}