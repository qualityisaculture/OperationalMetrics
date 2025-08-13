export interface BottleneckDetectorProps {
  projectName: string;
}

export interface BottleneckDetectorState {
  isLoading: boolean;
  data: LiteJiraIssue[] | null;
  error: string | null;
  jqlQuery: string;
}

export interface LiteJiraIssue {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  created: string;
  updated: string;
  priority: string;
  issueType: string;
}

export interface BottleneckDetectorResponse {
  message: string;
  data: string; // JSON stringified LiteJiraIssue[]
}
