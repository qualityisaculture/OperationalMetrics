import { MinimumIssueInfo } from "../../Types";
import Jira from "../Jira";
import JiraRequester from "../JiraRequester";
import { getSprintIssueListsBySprint } from "../Utils";
import { IssueInfo, SprintIssueList } from "./GraphManagerTypes";

export type SizeBucket = {
  days: number;
  label: string;
  issues: MinimumIssueInfo[];
};

export type LeadTimeSprintData = {
  sprintStartingDate: Date;
  sizeBuckets: SizeBucket[];
};

export type LeadTimeData = {
  sprints: LeadTimeSprintData[];
};

export default class LeadTimeGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  getIssueInfoBySizeBucket(issueInfos: IssueInfo[]): SizeBucket[] {
    const maxBucketSize = 10;
    let sizeBuckets: SizeBucket[] = [];
    sizeBuckets.push({
      days: 0,
      label: "null",
      issues: issueInfos
        .filter((issueInfo) => issueInfo.timespent === null)
        .map((issueInfo) => {
          return {
            key: issueInfo.key,
            summary: issueInfo.summary,
            url: issueInfo.url,
          };
        }),
    });
    for (let bucketSize = 1; bucketSize < maxBucketSize; bucketSize++) {
      let issues = issueInfos.filter((issueInfo) => {
        const timeSpent = issueInfo.timespent;
        return timeSpent !== null && timeSpent <= bucketSize;
      });
      issueInfos = issueInfos.filter((issueInfo) => {
        const timeSpent = issueInfo.timespent;
        return timeSpent !== null && timeSpent > bucketSize;
      });
      sizeBuckets.push({
        days: bucketSize,
        label: `${bucketSize} day${bucketSize > 1 ? "s" : ""}`,
        issues: issues.map((issueInfo) => {
          return {
            key: issueInfo.key,
            summary: issueInfo.summary,
            url: issueInfo.url,
          };
        }),
      });
    }
    sizeBuckets.push({
      days: maxBucketSize,
      label: `${maxBucketSize}+ days`,
      issues: issueInfos.map((issueInfo) => {
        return {
          key: issueInfo.key,
          summary: issueInfo.summary,
          url: issueInfo.url,
        };
      }),
    });
    return sizeBuckets;
  }

  async getLeadTimeData(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): Promise<LeadTimeData> {
    let jiras = await this.jiraRequester.getQuery(filter);
    let jirasBySprint: SprintIssueList[] = getSprintIssueListsBySprint(
      jiras,
      currentSprintStartDate
    );
    return {
      sprints: jirasBySprint.map((sprintIssueList) => {
        return {
          sprintStartingDate: sprintIssueList.sprintStartingDate,
          sizeBuckets: this.getIssueInfoBySizeBucket(sprintIssueList.issueList),
        };
      }),
    };
  }
}
