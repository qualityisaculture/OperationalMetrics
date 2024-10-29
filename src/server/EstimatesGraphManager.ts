import JiraRequester from './JiraRequester';

export type EstimateData = {
  date: Date;
  statusTimes: { status: string, time: number }[];
  originalEstimate: number | null;
  timeSpent: number | null;
};

export type EstimateDataArray = EstimateData[];

export default class EstimatesGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicEstimatesData(query: string): Promise<EstimateDataArray> {
    let jiras = await this.jiraRequester.getQuery(query);
    let response = jiras.map((jira) => {
      return {
        date: jira.getCreated(),
        statusTimes: jira.getStatusTimes(),
        originalEstimate: jira.getOriginalEstimate(),
        timeSpent: jira.getTimeSpent()
      };
    });
    return response;
  }
}