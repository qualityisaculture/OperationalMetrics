import Jira from "../Jira";
import JiraRequester from "../JiraRequester";
import { getSprintIssueListsBySprint } from "../Utils";
import { IssueInfo, SprintIssueList } from "./GraphManagerTypes";
import dayjs from "dayjs";

export default class ThroughputGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getThroughputData(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): Promise<SprintIssueList[]> {
    let query = this.getQuery(filter, currentSprintStartDate, numberOfSprints);
    let jiras = await this.jiraRequester.getQuery(query);
    let jirasWithoutPlaceHolders = jiras.filter(
      (jira) => jira.getSummary().indexOf("Placeholder") === -1
    );
    let bucketedJiras = getSprintIssueListsBySprint(
      jirasWithoutPlaceHolders,
      currentSprintStartDate
    );
    return bucketedJiras;
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
