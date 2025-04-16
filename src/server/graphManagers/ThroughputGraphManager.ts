import Jira from "../Jira";
import JiraRequester from "../JiraRequester";
import { getSprintIssueListsBySprint } from "../Utils";
import { IssueInfo, SprintIssueList } from "./GraphManagerTypes";
import dayjs from "dayjs";

export type SSEResponse = {
  status: "processing" | "complete" | "error";
  step?: string;
  message?: string;
  progress?: any;
  data?: string;
};

export default class ThroughputGraphManager {
  jiraRequester: JiraRequester;
  private sendProgress: (response: SSEResponse) => void;
  private lastProgress: any = {
    current: 0,
    total: 0,
    totalIssues: 0,
  };

  constructor(
    jiraRequester: JiraRequester,
    sendProgress?: (response: SSEResponse) => void
  ) {
    this.jiraRequester = jiraRequester;
    this.sendProgress = sendProgress || (() => {});
  }

  private updateProgress(step: string, message: string, progress?: any) {
    if (progress) {
      this.lastProgress = {
        ...this.lastProgress,
        ...progress,
      };
    }

    this.sendProgress({
      status: "processing",
      step,
      message,
      progress: this.lastProgress,
    });
  }

  async getThroughputData(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): Promise<SprintIssueList[]> {
    try {
      this.updateProgress(
        "initializing",
        "Starting to fetch throughput data..."
      );

      let query = this.getQuery(
        filter,
        currentSprintStartDate,
        numberOfSprints
      );
      this.updateProgress("fetching", "Fetching issues from Jira...");

      let jiras = await this.jiraRequester.getQuery(query);
      this.updateProgress("processing", "Processing Jira issues...", {
        totalIssues: jiras.length,
      });

      let jirasWithoutPlaceHolders = jiras.filter(
        (jira) => jira.getSummary().indexOf("Placeholder") === -1
      );

      this.updateProgress("bucketing", "Organizing issues by sprint...", {
        totalIssues: jirasWithoutPlaceHolders.length,
      });

      let bucketedJiras = getSprintIssueListsBySprint(
        jirasWithoutPlaceHolders,
        currentSprintStartDate
      );

      this.sendProgress({
        status: "complete",
        data: JSON.stringify(bucketedJiras),
      });

      return bucketedJiras;
    } catch (error) {
      this.sendProgress({
        status: "error",
        message: error.message,
      });
      throw error;
    }
  }

  getQuery(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): string {
    let resolvedDate = dayjs(currentSprintStartDate);
    resolvedDate = resolvedDate.subtract(2 * numberOfSprints, "week");
    let query =
      filter +
      ' AND status="Done" AND resolved >= ' +
      resolvedDate.format("YYYY-MM-DD");
    return query;
  }
}
