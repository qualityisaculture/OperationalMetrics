import { StatusDays } from "../../Types";

export type IssueInfo = {
  key: string;
  summary: string;
  status: string;
  type: string;
  created: string;
  resolved: string;
  resolution: string;
  epicKey: string | null;
  epicName: string | null;
  initiativeKey: string;
  initiativeName: string;
  labels: string[];
  priority: string;
  components: string[];
  fixVersions: string[];
  url: string;
  timeoriginalestimate: number | null;
  timespent: number | null;
};

export type LeadTimeIssueInfo = IssueInfo & {
  statusTimes: StatusDays[];
};

export type SprintIssueList = {
  sprintStartingDate: Date;
  issueList: IssueInfo[];
};
