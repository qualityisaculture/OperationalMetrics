import { MinimumIssueInfo } from "../../Types";
import JiraRequester from "../JiraRequester";

export type CumulativeFlowDiagramData = {
  allStatuses: string[];
  timeline: CumulativeFlowDiagramTimeline;
};

export type CumulativeFlowDiagramDateStatus = {
  date: Date;
  statuses: { status: string; issues: MinimumIssueInfo[] }[];
}

export type CumulativeFlowDiagramTimeline = CumulativeFlowDiagramDateStatus[];

export default class CumulativeFlowDiagramManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getCumulativeFlowDiagramData(
    query: string,
    startDate: Date,
    endDate: Date
  ): Promise<CumulativeFlowDiagramData> {
    let timeline = await this.getCumulativeFlowDiagramTimeline(
      query,
      startDate,
      endDate
    );
    let allStatuses = new Set<string>();
    timeline.forEach((day) => {
      day.statuses.forEach((status) => {
        allStatuses.add(status.status);
      });
    });
    return { allStatuses: Array.from(allStatuses), timeline: timeline };
  }

  async getCumulativeFlowDiagramTimeline(
    query: string,
    startDate: Date,
    endDate: Date
  ): Promise<CumulativeFlowDiagramTimeline> {
    let jiraData = await this.jiraRequester.getQuery(query);
    let dateStatuses: CumulativeFlowDiagramTimeline = [];
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      let statuses = new Map<
        string,
        { status: string; issues: MinimumIssueInfo[] }
      >();
      for (let issue of jiraData) {
        let status = await issue.getStatus(new Date(date));
        if (!statuses.has(status)) {
          statuses.set(status, { status: status, issues: [] });
        }
        // @ts-ignore
        statuses.get(status).issues.push({
          key: issue.getKey(),
          summary: issue.getSummary(),
          url: issue.getUrl(),
        });
      }
      dateStatuses.push({
        date: new Date(date),
        statuses: Array.from(statuses.values()),
      });
    }
    return dateStatuses;
  }
}
