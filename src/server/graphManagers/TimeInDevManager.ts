import JiraRequester from "../JiraRequester";

export interface ElapsedTime {
  key: string;
  currentStatus: string;
  timespent: number;
  url: string;
  statuses: { status: string; time: number }[];
}

export default class TimeInDevManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getTimeInDevData(query: string): Promise<ElapsedTime[]> {
    let jiras = await this.jiraRequester.getQuery(query);
    return jiras.map((jira) => {
      let key = jira.fields.key;
      let url = jira.fields.url;
      let timespent = jira.fields.timespent || 0;
      let currentStatus = jira.fields.status.name;
      let statuses = jira.getStatusTimes();
      return { key, currentStatus, timespent, url, statuses };
    });
  }
}
