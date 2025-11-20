import JiraRequester from "../JiraRequester";
import Jira from "../Jira";

export interface BugsAnalysisIssue {
  key: string;
  summary: string;
  type: string;
  status: string;
  created: string;
  resolved: string | null;
  timeSpent: number | null; // in days
  url: string;
}

export interface QuarterData {
  quarter: string; // e.g., "2024-Q1"
  resolved: number;
  unresolved: number;
  resolvedIssues: BugsAnalysisIssue[];
  unresolvedIssues: BugsAnalysisIssue[];
  averageTimeSpent: number | null; // in days, only for resolved issues
}

export interface BugsAnalysisData {
  issues: BugsAnalysisIssue[];
  quarterlyData: QuarterData[];
}

export default class BugsAnalysisGraphManager {
  private jiraRequester: JiraRequester;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getBugsAnalysisData(query: string): Promise<BugsAnalysisData> {
    console.log("BugsAnalysisGraphManager: Processing query:", query);

    try {
      // Fetch issues from Jira
      const jiraIssues = await this.jiraRequester.getQuery(query);

      console.log(`BugsAnalysisGraphManager: Found ${jiraIssues.length} issues`);

      // Convert to BugsAnalysisIssue format
      const issues: BugsAnalysisIssue[] = jiraIssues.map((jira: Jira) => {
        const domain = process.env.JIRA_DOMAIN;
        return {
          key: jira.getKey(),
          summary: jira.getSummary(),
          type: jira.getType(),
          status: jira.getStatus(),
          created: jira.fields.created,
          resolved: jira.getResolution() ? jira.fields.resolutiondate : null,
          timeSpent: jira.getTimeSpent(),
          url: jira.getUrl(),
        };
      });

      // Group by quarter
      const quarterlyData = this.groupByQuarter(issues);

      return {
        issues,
        quarterlyData,
      };
    } catch (error) {
      console.error("Error fetching bugs analysis data:", error);
      throw error;
    }
  }

  private groupByQuarter(issues: BugsAnalysisIssue[]): QuarterData[] {
    const quarterMap = new Map<string, QuarterData>();

    issues.forEach((issue) => {
      const createdDate = new Date(issue.created);
      const quarter = this.getQuarter(createdDate);

      if (!quarterMap.has(quarter)) {
        quarterMap.set(quarter, {
          quarter,
          resolved: 0,
          unresolved: 0,
          resolvedIssues: [],
          unresolvedIssues: [],
          averageTimeSpent: null,
        });
      }

      const quarterData = quarterMap.get(quarter)!;
      const isResolved = issue.resolved !== null;

      if (isResolved) {
        quarterData.resolved++;
        quarterData.resolvedIssues.push(issue);
      } else {
        quarterData.unresolved++;
        quarterData.unresolvedIssues.push(issue);
      }
    });

    // Calculate average time spent for each quarter
    quarterMap.forEach((quarterData) => {
      const resolvedWithTimeSpent = quarterData.resolvedIssues.filter(
        (issue) => issue.timeSpent !== null && issue.timeSpent > 0
      );

      if (resolvedWithTimeSpent.length > 0) {
        const totalTimeSpent = resolvedWithTimeSpent.reduce(
          (sum, issue) => sum + (issue.timeSpent || 0),
          0
        );
        quarterData.averageTimeSpent = totalTimeSpent / resolvedWithTimeSpent.length;
      }
    });

    // Convert to array and sort by quarter
    return Array.from(quarterMap.values()).sort((a, b) =>
      a.quarter.localeCompare(b.quarter)
    );
  }

  private getQuarter(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
  }
}

