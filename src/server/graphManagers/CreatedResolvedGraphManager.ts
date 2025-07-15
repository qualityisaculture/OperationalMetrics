import JiraRequester from "../JiraRequester";

export interface CreatedResolvedIssue {
  key: string;
  summary: string;
  type: string;
  url: string;
}

export interface DailyDataPoint {
  date: string;
  createdIssues: CreatedResolvedIssue[];
  resolvedIssues: CreatedResolvedIssue[];
}

export interface CreatedResolvedData {
  dailyData: DailyDataPoint[];
  summary: {
    totalCreated: number;
    totalResolved: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export default class CreatedResolvedGraphManager {
  private jiraRequester: JiraRequester;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getCreatedResolvedData(
    query: string,
    startDate: Date,
    endDate: Date
  ): Promise<CreatedResolvedData> {
    console.log("CreatedResolvedGraphManager: Processing query:", query);
    console.log("Date range:", startDate, "to", endDate);

    // Format dates for JQL (YYYY-MM-DD format)
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Build JQL queries for created and resolved issues
    const createdQuery = `${query} AND created >= "${startDateStr}" AND created <= "${endDateStr}" ORDER BY created ASC`;
    const resolvedQuery = `${query} AND resolved >= "${startDateStr}" AND resolved <= "${endDateStr}" ORDER BY resolved ASC`;

    console.log("Created query:", createdQuery);
    console.log("Resolved query:", resolvedQuery);

    try {
      // Fetch created and resolved issues from Jira
      const [createdIssues, resolvedIssues] = await Promise.all([
        this.jiraRequester.getQuery(createdQuery),
        this.jiraRequester.getQuery(resolvedQuery),
      ]);

      console.log(
        `Found ${createdIssues.length} created issues and ${resolvedIssues.length} resolved issues`
      );

      // Process and group issues by date
      const dailyData = this.processIssuesByDate(
        createdIssues,
        resolvedIssues,
        startDate,
        endDate
      );

      // Calculate summary
      const totalCreated = createdIssues.length;
      const totalResolved = resolvedIssues.length;

      return {
        dailyData,
        summary: {
          totalCreated,
          totalResolved,
          dateRange: {
            start: startDateStr,
            end: endDateStr,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching data from Jira:", error);
      throw error;
    }
  }

  private processIssuesByDate(
    createdIssues: any[],
    resolvedIssues: any[],
    startDate: Date,
    endDate: Date
  ): DailyDataPoint[] {
    const dailyDataMap = new Map<string, DailyDataPoint>();

    // Initialize all dates in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dailyDataMap.set(dateStr, {
        date: dateStr,
        createdIssues: [],
        resolvedIssues: [],
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process created issues
    createdIssues.forEach((issue) => {
      const createdDate = new Date(issue.fields.created);
      const dateStr = createdDate.toISOString().split("T")[0];

      if (dailyDataMap.has(dateStr)) {
        dailyDataMap.get(dateStr)!.createdIssues.push({
          key: issue.key,
          summary: issue.fields.summary,
          type: issue.fields.issuetype.name,
          url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
        });
      }
    });

    // Process resolved issues
    resolvedIssues.forEach((issue) => {
      const resolvedDate = new Date(issue.fields.resolutiondate);
      const dateStr = resolvedDate.toISOString().split("T")[0];

      if (dailyDataMap.has(dateStr)) {
        dailyDataMap.get(dateStr)!.resolvedIssues.push({
          key: issue.key,
          summary: issue.fields.summary,
          type: issue.fields.issuetype.name,
          url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
        });
      }
    });

    // Convert map to array and sort by date
    return Array.from(dailyDataMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }
}
