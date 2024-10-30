export type IssueInfo = {
  key: string;
  summary: string;
  status: string;
  type: string;
  created: string;
  resolved: string;
  resolution: string;
  epic: string | null;
  labels: string[];
  priority: string;
  components: string[];
  fixVersions: string[];
};