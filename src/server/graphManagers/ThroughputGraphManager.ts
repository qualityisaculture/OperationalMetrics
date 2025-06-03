import Jira from "../Jira";
import JiraRequester from "../JiraRequester";
import { getIssueInfoFromJira, getSprintIssueListsBySprint } from "../Utils";
import { IssueInfo, SprintIssueList } from "./GraphManagerTypes";
import dayjs from "dayjs";

export type SSEResponse = {
  status: "processing" | "complete" | "error";
  step?: string;
  message?: string;
  progress?: any;
  data?: string;
  openTickets?: string;
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
  ): Promise<{
    resolvedTickets: SprintIssueList[];
    openTickets: IssueInfo[];
  }> {
    try {
      this.updateProgress(
        "initializing",
        "Starting to fetch throughput data..."
      );

      // Get resolved tickets
      let resolvedQuery = this.getQuery(
        filter,
        currentSprintStartDate,
        numberOfSprints
      );
      this.updateProgress("fetching", "Fetching resolved issues from Jira...");

      let resolvedJiras = await this.jiraRequester.getQuery(resolvedQuery);
      this.updateProgress("processing", "Processing resolved Jira issues...", {
        totalIssues: resolvedJiras.length,
      });

      let resolvedJirasWithoutPlaceHolders = resolvedJiras.filter(
        (jira) => jira.getSummary().indexOf("Placeholder") === -1
      );

      this.updateProgress(
        "bucketing",
        "Organizing resolved issues by sprint...",
        {
          totalIssues: resolvedJirasWithoutPlaceHolders.length,
        }
      );

      let resolvedBucketedJiras = getSprintIssueListsBySprint(
        resolvedJirasWithoutPlaceHolders,
        currentSprintStartDate
      );

      // Get open tickets
      this.updateProgress("fetching", "Fetching open issues from Jira...");
      let openQuery = this.getOpenTicketsQuery(filter);
      let openJiras = await this.jiraRequester.getQuery(openQuery);

      this.updateProgress("processing", "Processing open Jira issues...", {
        totalIssues: openJiras.length,
      });

      let openJirasWithoutPlaceHolders = openJiras
        .filter((jira) => jira.getSummary().indexOf("Placeholder") === -1)
        .map((jira) => getIssueInfoFromJira(jira));

      this.sendProgress({
        status: "complete",
        data: JSON.stringify(resolvedBucketedJiras),
        openTickets: JSON.stringify(openJirasWithoutPlaceHolders),
      });

      return {
        resolvedTickets: resolvedBucketedJiras,
        openTickets: openJirasWithoutPlaceHolders,
      };
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

  private getOpenTicketsQuery(filter: string): string {
    return filter + ' AND statusCategory = "In Progress"';
  }
}
