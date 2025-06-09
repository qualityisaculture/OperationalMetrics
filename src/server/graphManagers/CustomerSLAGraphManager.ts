import JiraRequester from "../JiraRequester";
import { getWorkDaysBetween } from "../Utils";

export type CustomerSLAIssue = {
  key: string;
  summary: string;
  type: string;
  status: string;
  daysInCurrentStatus: number;
  url: string;
};

export default class CustomerSLAGraphManager {
  jiraRequester: JiraRequester;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getCustomerSLAData(projectName: string): Promise<CustomerSLAIssue[]> {
    console.log(`CustomerSLAGraphManager: Processing project ${projectName}`);

    // Build JQL query to get all issues in the project that are not Done
    const jqlQuery = `project = "${projectName}" AND statusCategory != Done ORDER BY updated DESC`;

    console.log(`CustomerSLAGraphManager: Executing JQL query: ${jqlQuery}`);

    try {
      // Fetch issues from Jira
      const jiraIssues = await this.jiraRequester.getQuery(jqlQuery);

      console.log(`CustomerSLAGraphManager: Found ${jiraIssues.length} issues`);

      // Convert to CustomerSLAIssue format and calculate days in current status
      const customerSLAIssues: CustomerSLAIssue[] = jiraIssues.map((jira) => {
        // Get current status and calculate days in current status
        const currentStatus = jira.getStatus();
        const daysInCurrentStatus = this.calculateDaysInCurrentStatus(jira);

        return {
          key: jira.getKey(),
          summary: jira.getSummary(),
          type: jira.getType(),
          status: currentStatus,
          daysInCurrentStatus: Math.round(daysInCurrentStatus * 10) / 10, // Round to 1 decimal place
          url: jira.getUrl(),
        };
      });

      console.log(
        `CustomerSLAGraphManager: Processed ${customerSLAIssues.length} issues`
      );
      return customerSLAIssues;
    } catch (error) {
      console.error(
        `CustomerSLAGraphManager: Error fetching data for project ${projectName}:`,
        error
      );
      throw error;
    }
  }

  private calculateDaysInCurrentStatus(jira: any): number {
    const currentStatus = jira.getStatus();
    const statusChanges = jira.statusChanges;

    // Find the most recent change to the current status
    let lastStatusChangeDate: Date = jira.getCreated();

    // Look through status changes in reverse to find the most recent change to current status
    for (let i = statusChanges.length - 1; i >= 0; i--) {
      if (statusChanges[i].status === currentStatus) {
        lastStatusChangeDate = statusChanges[i].date;
        break;
      }
    }

    // If we didn't find a status change to current status, it means the issue was created in this status
    // In that case, use the created date

    // Calculate business days between last status change and now
    const now = new Date();
    return getWorkDaysBetween(lastStatusChangeDate, now);
  }
}
