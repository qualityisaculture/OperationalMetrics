import { MinimumIssueInfo, StatusDays } from "../../Types";
import Jira from "../Jira";
import JiraRequester from "../JiraRequester";
import { getIssuesBySprint, getSprintIssueListsBySprint } from "../Utils";
import {
  IssueInfo,
  LeadTimeIssueInfo,
  SprintIssueList,
} from "./GraphManagerTypes";
import dayjs from "dayjs";

export type MinimumLeadTimeIssueInfo = MinimumIssueInfo & {
  statusTimes: StatusDays[];
  timeSpentInDays: number;
};

export type LeadTimeData = {
  timeSpentInDays: number;
  label: string;
  issues: MinimumLeadTimeIssueInfo[];
};

export type LeadTimeSprintData = {
  sprintStartingDate: Date;
  issues: LeadTimeIssueInfo[];
  // sizeBuckets: SizeBucket[];
};

export type LeadTimeSprints = {
  sprints: LeadTimeSprintData[];
};

export default class LeadTimeGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  getLeadTimeIssueInfo(jira: Jira): LeadTimeIssueInfo {
    return {
      key: jira.getKey(),
      summary: jira.getSummary(),
      status: jira.getStatus(),
      type: jira.getType(),
      created: jira.getCreated().toISOString(),
      resolved: jira.getResolved().toISOString(),
      resolution: jira.getResolution(),
      epicKey: jira.getEpicKey(),
      epicName: jira.getEpicName(),
      initiativeKey: jira.getInitiativeKey(),
      initiativeName: jira.getInitiativeName(),
      labels: jira.getLabels(),
      priority: jira.getPriority(),
      components: jira.getComponents(),
      fixVersions: jira.getFixVersions(),
      url: jira.getUrl(),
      timeoriginalestimate: jira.getOriginalEstimate(),
      timespent: jira.getTimeSpent(),
      statusTimes: jira.getStatusDays(),
      account: jira.getAccount(),
    };
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

  async getLeadTimeData(
    filter: string,
    currentSprintStartDate: Date,
    numberOfSprints: number
  ): Promise<LeadTimeSprints> {
    let modifiedQuery = this.getQuery(
      filter,
      currentSprintStartDate,
      numberOfSprints
    );
    let jiras = await this.jiraRequester.getQuery(modifiedQuery);
    let jirasBySprint: { sprintStartingDate: Date; issues: Jira[] }[] =
      getIssuesBySprint(jiras, currentSprintStartDate);
    return {
      sprints: jirasBySprint.map((sprintIssueList) => {
        return {
          sprintStartingDate: sprintIssueList.sprintStartingDate,
          issues: sprintIssueList.issues.map((jira) =>
            this.getLeadTimeIssueInfo(jira)
          ),
        };
      }),
    };
  }
}
