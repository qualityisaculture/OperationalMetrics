import Jira from '../Jira';
import JiraRequester from '../JiraRequester';
import { IssueInfo } from './GraphManagerTypes';
import dayjs from 'dayjs';

export type ThroughputDataType = {
  sprintStartingDate: Date;
  issueList: IssueInfo[];
};

export default class ThroughputGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getThroughputData(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): Promise<ThroughputDataType[]> {
    let query = this.getQuery(filter, currentSprintStartDate, numberOfSprints);
    let jiras = await this.jiraRequester.getQuery(query);
    let bucketedJiras = this.getJirasBySprint(jiras, currentSprintStartDate);
    return bucketedJiras;
  }

  getJirasBySprint(jiras, currentSprintStartDate) {
    let sprints: ThroughputDataType[] = [];
    currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 14);
    while (jiras.length > 0) {
      let twoWeeksAgo = new Date(currentSprintStartDate);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      let jirasInSprint = jiras.filter((jira) => jira.getResolved() > twoWeeksAgo);
      sprints.push({
        sprintStartingDate: twoWeeksAgo,
        issueList: jirasInSprint.map((jira) => this.getIssueInfoFromJira(jira)),
      });
      jiras = jiras.filter((jira) => jira.getResolved() <= twoWeeksAgo);
      currentSprintStartDate = twoWeeksAgo;
    }
    return sprints;
  }

  getQuery(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): string {
    let resolvedDate = dayjs(currentSprintStartDate);
    resolvedDate = resolvedDate.subtract(2 * numberOfSprints, 'week');
    let query =
      filter + ' AND status="Done" AND resolved >= ' + resolvedDate.format('YYYY-MM-DD');
    return query;
  }

  getIssueInfoFromJira(jira: Jira): IssueInfo {
    return {
      key: jira.getKey(),
      summary: jira.getSummary(),
      status: jira.getStatus(),
      type: jira.getType(),
      created: jira.getCreated().toISOString(),
      resolved: jira.getResolved().toISOString(),
      resolution: jira.getResolution(),
      parentKey: jira.getParent(),
      parentName: jira.getParentName(),
      labels: jira.getLabels(),
      priority: jira.getPriority(),
      components: jira.getComponents(),
      fixVersions: jira.getFixVersions(),
    };
  }
}
