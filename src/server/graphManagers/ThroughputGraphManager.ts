import Jira from '../Jira';
import JiraRequester from '../JiraRequester';
import { IssueInfo } from './GraphManagerTypes';

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
    query: string,
    currentSprintStartDate: Date
  ): Promise<ThroughputDataType[]> {
    let jiras = await this.jiraRequester.getQuery(query);

    let bucketedJiras: ThroughputDataType[] = [];
    currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 14);
    //step backwards two weeks putting all jiras greater than that date into a bucket and then removing them from the list
    while(jiras.length > 0) {
      let twoWeeksAgo = new Date(currentSprintStartDate);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      let bucket = jiras.filter(jira => jira.getResolved() > twoWeeksAgo);
      bucketedJiras.push({
        sprintStartingDate: twoWeeksAgo,
        issueList: bucket.map((jira) => this.getIssueInfoFromJira(jira)),
      });
      jiras = jiras.filter(jira => jira.getResolved() <= twoWeeksAgo);
      currentSprintStartDate = twoWeeksAgo;
    };
    return bucketedJiras;


    // return {
    //   sprintStartingDate: jiras[0].getCreated(),
    //   issueList: jiras.map((jira) => this.getIssueInfoFromJira(jira)),
    // };
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
      epic: jira.getEpic(),
      labels: jira.getLabels(),
      priority: jira.getPriority(),
      components: jira.getComponents(),
      fixVersions: jira.getFixVersions(),
    };
  }
}
