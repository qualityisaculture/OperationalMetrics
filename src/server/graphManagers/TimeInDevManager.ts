import { StatusDays } from "../../Types";
import JiraRequester from "../JiraRequester";

export interface ElapsedTime {
  key: string;
  summary: string;
  currentStatus: string;
  timespent: number;
  url: string;
  statuses: StatusDays[];
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
      let summary = jira.fields.summary;
      let url = jira.fields.url;
      let timespent = jira.fields.timespent || 0;
      let currentStatus = jira.fields.status.name;
      let statuses = jira.getStatusDays();
      return { key, summary, currentStatus, timespent, url, statuses };
    });
  }
}
