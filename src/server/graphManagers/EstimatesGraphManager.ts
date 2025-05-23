import { StatusDays } from "../../Types";
import Jira from "../Jira";
import JiraRequester from "../JiraRequester";

export type EstimateData = {
  date: Date;
  key: string;
  type: string;
  statusTimes: StatusDays[];
  originalEstimate: number | null;
  timeSpent: number | null;
};

export type EstimateDataArray = EstimateData[];

export type EstimatesData = {
  uniqueStatuses: string[];
  estimateData: EstimateData[];
};

export default class EstimatesGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicEstimatesData(query: string): Promise<EstimatesData> {
    let jiras = await this.jiraRequester.getQuery(query);
    let uniqueStatuses = this.getUniqueStatuses(jiras);
    return {
      uniqueStatuses,
      estimateData: jiras.map((jira) => {
        return {
          date: jira.getCreated(),
          key: jira.getKey(),
          type: jira.getType(),
          statusTimes: jira.getStatusDays(),
          originalEstimate: jira.getOriginalEstimate(),
          timeSpent: jira.getTimeSpent(),
        };
      }),
    };
  }

  getUniqueStatuses(jiras: Jira[]): string[] {
    let uniqueStatuses = new Set<string>();
    jiras.forEach((jira) => {
      jira.getStatusDays().forEach((statusTime) => {
        uniqueStatuses.add(statusTime.status);
      });
    });
    return Array.from(uniqueStatuses);
  }
}
