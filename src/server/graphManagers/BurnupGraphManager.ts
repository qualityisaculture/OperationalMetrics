import { MinimumIssueInfo, TDateISODate, SSEResponse } from "../../Types";
import Jira from "../Jira";
import JiraRequester, { lastUpdatedKey } from "../JiraRequester";

export type DoneAndScopeCount = {
  //datestring
  date: TDateISODate;
  doneCount: number | null;
  doneEstimate: number | null;
  doneKeys: string[];
  inProgressCount: number | null;
  inProgressEstimate: number | null;
  inProgressKeys: string[];
  scopeCount: number | null;
  scopeEstimate: number | null;
  scopeKeys: string[];
  timeSpent: number | null; // Total time spent in days
};

export type EpicBurnup = {
  key: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  doneCountIncrement: number; //How many items are completed each day on average
  doneCountLimit: number; //The maximum number of items that can be completed
  doneEstimateIncrement: number; //How many points are completed each day on average
  doneEstimateLimit: number; //The maximum number of points that can be completed
  dateData: DoneAndScopeCount[];
  allJiraInfo: MinimumIssueInfo[];
};

export type EpicBurnupResponse = {
  originalKey: string;
  originalSummary: string;
  originalType: string;
  originalUrl: string;
  epicBurnups: EpicBurnup[];
};

export default class BurnupGraphManager {
  jiraRequester: JiraRequester;
  private sendProgress: (response: SSEResponse) => void;
  private lastProgress: any = {
    current: 0,
    total: 0,
    currentEpic: "",
    totalEpics: 0,
    totalIssues: 0,
    totalJiraRequests: 0,
    currentJiraRequest: 0,
  };

  constructor(
    jiraRequester: JiraRequester,
    sendProgress?: (response: SSEResponse) => void
  ) {
    this.jiraRequester = jiraRequester;
    this.sendProgress = sendProgress || (() => {});
  }

  private updateProgress(step: string, message: string, progress?: any) {
    // Keep track of the last progress data
    if (progress) {
      this.lastProgress = {
        ...this.lastProgress,
        ...progress,
      };
    }

    this.sendProgress({
      status: "processing",
      step: step as any,
      message,
      progress: this.lastProgress,
    });
  }

  async getEpicBurnupsToDate(epics: Jira[]): Promise<EpicBurnup[]> {
    return await Promise.all(epics.map((jira) => this.getBurnupChart(jira)));
  }

  async getBurnupChart(epic: Jira): Promise<EpicBurnup> {
    let burnupArrayData = await this.getBurnupArrayToDate(epic);

    let burnupArray = burnupArrayData.data;
    let startDate = epic.getEpicStartDate() || epic.getCreated();
    let today = new Date();
    let daysBetween = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let finalDoneCount = burnupArray[burnupArray.length - 1].doneCount || 0;
    let finalDoneEstimate =
      burnupArray[burnupArray.length - 1].doneEstimate || 0;
    let finalScopeCount = burnupArray[burnupArray.length - 1].scopeCount || 0;

    let doneCountIncrement = finalDoneCount / daysBetween;
    let doneEstimateIncrement = finalDoneEstimate / daysBetween;

    return {
      key: epic.getKey(),
      summary: epic.getSummary(),
      startDate: epic.getEpicStartDate() || epic.getCreated(),
      endDate: epic.getEpicDueDate() || new Date(),
      doneCountIncrement,
      doneCountLimit: burnupArrayData.totalCount, //this seems wrong
      doneEstimateIncrement,
      doneEstimateLimit: burnupArrayData.totalEstimate, // this seems wrong
      dateData: burnupArray,
      allJiraInfo: burnupArrayData.allChildJiras.map((jira) => {
        return {
          key: jira.getKey(),
          summary: jira.getSummary(),
          url: jira.getUrl(),
          status: jira.getStatus(),
        };
      }),
    };
  }

  async getEpicsFromQuery(query: string): Promise<Jira[]> {
    return await this.jiraRequester.getQuery(query);
  }

  async getAllEpicsUnderIssue(key: string): Promise<string[]> {
    const issue = await this.jiraRequester.getFullJiraDataFromKeys([{ key }]);
    if (!issue || issue.length === 0) return [];

    const issueType = issue[0].getType();
    if (issueType === "Epic") {
      return [key];
    }

    // Get all children of the current issue
    const children = await this.jiraRequester.getQuery(`parent=${key}`);
    const childKeys = children.map((child) => child.getKey());

    // Recursively get all epics under each child
    const epicPromises = childKeys.map((childKey) =>
      this.getAllEpicsUnderIssue(childKey)
    );
    const epicArrays = await Promise.all(epicPromises);

    // Flatten the array of arrays into a single array of epic keys
    return epicArrays.flat();
  }

  async getEpicsFromKeys(keys: string[]): Promise<Jira[]> {
    let lastUpdatedKeys = keys.map((key) => ({ key }));
    let epics =
      await this.jiraRequester.getFullJiraDataFromKeys(lastUpdatedKeys);
    return await Promise.all(
      epics.map((jira) => this.addChildKeysToJira(jira))
    );
  }

  async getEpicBurnupData(key: string): Promise<EpicBurnupResponse> {
    this.updateProgress("initializing", "Starting to process burnup data...");

    // Get the original issue's info
    this.updateProgress(
      "getting_original_issue",
      `Getting details for issue ${key}...`,
      {
        currentJiraRequest: 1,
        totalJiraRequests: 1,
      }
    );
    const originalIssue = await this.jiraRequester.getFullJiraDataFromKeys([
      { key },
    ]);
    if (!originalIssue || originalIssue.length === 0) {
      throw new Error(`Issue ${key} not found`);
    }

    // Find all epics under the issue
    this.updateProgress(
      "finding_epics",
      "Finding all epics under the issue..."
    );
    let epicKeys = await this.getAllEpicsUnderIssue(key);
    this.updateProgress("finding_epics", `Found ${epicKeys.length} epics`, {
      current: 0,
      total: epicKeys.length,
      totalEpics: epicKeys.length,
      currentJiraRequest: 2,
      totalJiraRequests: 2 + epicKeys.length, // Original issue + epic details + child issues
    });

    // Get epic details
    this.updateProgress(
      "getting_epic_details",
      "Getting details for all epics..."
    );
    let epics = await this.getEpicsFromKeys(epicKeys);

    // Process each epic
    let burnupArrays: EpicBurnup[] = [];
    for (let i = 0; i < epics.length; i++) {
      const epic = epics[i];
      this.updateProgress(
        "processing_epic",
        `Processing epic ${epic.getKey()} (${i + 1}/${epicKeys.length})`,
        {
          current: i + 1,
          total: epicKeys.length,
          currentEpic: epic.getKey(),
          totalEpics: epicKeys.length,
          currentJiraRequest: 3 + i,
          totalJiraRequests: 2 + epicKeys.length,
        }
      );

      // Get all children for this epic
      this.updateProgress(
        "getting_child_issues",
        `Getting child issues for epic ${epic.getKey()}...`
      );
      const allChildren = await this.getAllChildrenJiras(epic);
      this.updateProgress(
        "processing_child_issues",
        `Processing ${allChildren.length} child issues for epic ${epic.getKey()}...`,
        {
          current: i + 1,
          total: epicKeys.length,
          currentEpic: epic.getKey(),
          currentEpicProgress: 0,
          totalEpics: epicKeys.length,
          totalIssues: allChildren.length,
          currentJiraRequest: 3 + i,
          totalJiraRequests: 2 + epicKeys.length + allChildren.length,
        }
      );

      // Calculate burnup data
      this.updateProgress(
        "calculating_burnup",
        `Calculating burnup data for epic ${epic.getKey()}...`
      );
      const burnupData = await this.getBurnupChart(epic);
      burnupArrays.push(burnupData);
    }

    this.updateProgress("complete", "Burnup data calculation complete");

    return {
      originalKey: key,
      originalSummary: originalIssue[0].getSummary(),
      originalType: originalIssue[0].getType(),
      originalUrl: originalIssue[0].getUrl(),
      epicBurnups: burnupArrays,
    };
  }

  async addChildKeysToJira(jira: Jira): Promise<Jira> {
    let childJiras = await this.jiraRequester.getQuery(
      `parent=${jira.getKey()}`
    );
    let childKeys = childJiras.map((child) => {
      return { key: child.getKey(), created: child.getCreated() };
    });
    jira.fields.childKeys = childKeys;
    console.log("Added child keys to jira", jira.getKey(), childKeys);
    return jira;
  }

  async getBurnupArrayToDate(epic: Jira): Promise<{
    data: DoneAndScopeCount[];
    totalCount: number;
    totalEstimate: number;
    allChildJiras: Jira[];
  }> {
    let startDate = epic.getEpicStartDate() || epic.getCreated();
    let endDate = epic.getEpicDueDate() || new Date();
    endDate.setDate(endDate.getDate() + 1);
    let allChildJiras = await this.getAllChildrenJiras(epic);
    let childJiras = allChildJiras.filter((child) => child.isInScope(endDate));
    let childJiraTotalEstimate = childJiras.reduce(
      (sum, child) => sum + (child.getOriginalEstimate() || 0),
      0
    );

    let burnupArray: DoneAndScopeCount[] = [];
    let timeSpentMap = new Map<string, number>(); // Track time spent per issue

    for (
      let date = startDate;
      date <= new Date();
      date.setDate(date.getDate() + 1)
    ) {
      let doneChildren = allChildJiras.filter((child) => child.isDone(date));
      let inProgressChildren = allChildJiras.filter((child) =>
        child.isDoneOrDoing(date)
      );
      let existingChildren = await this.getAllChildrenJiras(epic, date);
      let scopeChildren = existingChildren.filter((child) =>
        child.isInScope(date)
      );

      // Update time spent for each child
      allChildJiras.forEach((child) => {
        const changelog = child.changelog?.histories || [];
        changelog.forEach((history) => {
          const historyDate = new Date(history.created);
          if (historyDate <= date) {
            history.items.forEach((item) => {
              if (item.field === "timespent") {
                const timeSpent = parseInt(item.toString) / (3600 * 8); // Convert to days
                timeSpentMap.set(child.getKey(), timeSpent);
              }
            });
          }
        });
      });

      let doneEstimate = doneChildren.reduce(
        (sum, child) => sum + (child.getOriginalEstimate() || 0),
        0
      );
      let inProgressEstimate = inProgressChildren.reduce(
        (sum, child) => sum + (child.getOriginalEstimate() || 0),
        0
      );
      let scopeEstimate = scopeChildren.reduce(
        (sum, child) => sum + (child.getOriginalEstimate() || 0),
        0
      );

      // Calculate total time spent for all children
      let totalTimeSpent = Array.from(timeSpentMap.values()).reduce(
        (sum, time) => sum + time,
        0
      );

      burnupArray.push({
        date: new Date(date).toISOString().split("T")[0] as TDateISODate,
        doneCount: doneChildren.length,
        doneEstimate,
        doneKeys: doneChildren.map((child) => child.getKey()),
        inProgressCount: inProgressChildren.length,
        inProgressEstimate,
        inProgressKeys: inProgressChildren.map((child) => child.getKey()),
        scopeCount: scopeChildren.length,
        scopeEstimate,
        scopeKeys: scopeChildren.map((child) => child.getKey()),
        timeSpent: totalTimeSpent || null,
      });
    }

    return {
      data: burnupArray,
      totalCount: allChildJiras.length,
      totalEstimate: childJiraTotalEstimate,
      allChildJiras,
    };
  }

  async getAllChildrenJiras(jira: Jira, date?: Date): Promise<Jira[]> {
    let keysSet = new Set<lastUpdatedKey>();
    let childrenKeys = jira.getChildrenKeysFromHistories(date);
    childrenKeys.forEach((key) => keysSet.add(key));
    let otherKeys = jira.fields.childKeys;
    otherKeys.forEach((keyCreatedPair) => {
      if (date) {
        let created = new Date(keyCreatedPair.created);
        if (created < date) {
          keysSet.add(keyCreatedPair);
        }
      } else {
        keysSet.add(keyCreatedPair);
      }
    });
    let jiras = await this.jiraRequester.getFullJiraDataFromKeys(
      Array.from(keysSet)
    );
    return jiras;
  }
}
