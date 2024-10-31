export type IssueInfo = {
  key: string;
  summary: string;
  status: string;
  type: string;
  created: string;
  resolved: string;
  resolution: string;
  parentKey: string | null;
  parentName: string | null;
  labels: string[];
  priority: string;
  components: string[];
  fixVersions: string[];
};