import { MinimumIssueInfo, TDateISODate, SSEResponse } from "../../Types";
import Jira from "../Jira";
import JiraRequester, { lastUpdatedKey } from "../JiraRequester";

export type DoneAndScopeCount = {
  //datestring
  date: TDateISODate;
  doneDevCount: number | null;
  doneDevEstimate: number | null;
  doneDevKeys: string[];
  doneTestCount: number | null;
  doneTestEstimate: number | null;
  doneTestKeys: string[];
  inProgressDevCount: number | null;
  inProgressDevEstimate: number | null;
  inProgressDevKeys: string[];
  inProgressTestCount: number | null;
  inProgressTestEstimate: number | null;
  inProgressTestKeys: string[];
  scopeDevCount: number | null;
  scopeDevEstimate: number | null;
  scopeDevKeys: string[];
  scopeTestCount: number | null;
  scopeTestEstimate: number | null;
  scopeTestKeys: string[];
  timeSpent: number | null; // Total time spent in days
};

export type EpicBurnup = {
  key: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  doneDevCountIncrement: number; //How many items are completed each day on average
  doneDevCountLimit: number; //The maximum number of items that can be completed
  doneDevEstimateIncrement: number; //How many points are completed each day on average
  doneDevEstimateLimit: number; //The maximum number of points that can be completed
  doneTestCountIncrement: number; //How many test items are completed each day on average
  doneTestCountLimit: number; //The maximum number of test items that can be completed
  doneTestEstimateIncrement: number; //How many test points are completed each day on average
  doneTestEstimateLimit: number; //The maximum number of test points that can be completed
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

    let finalDoneCount = burnupArray[burnupArray.length - 1].doneDevCount || 0;
    let finalDoneEstimate =
      burnupArray[burnupArray.length - 1].doneDevEstimate || 0;
    let finalScopeCount =
      burnupArray[burnupArray.length - 1].scopeDevCount || 0;

    let doneDevCountIncrement = finalDoneCount / daysBetween;
    let doneDevEstimateIncrement = finalDoneEstimate / daysBetween;

    return {
      key: epic.getKey(),
      summary: epic.getSummary(),
      startDate: epic.getEpicStartDate() || epic.getCreated(),
      endDate: epic.getEpicDueDate() || new Date(),
      doneDevCountIncrement,
      doneDevCountLimit: burnupArrayData.totalCount, //this seems wrong
      doneDevEstimateIncrement,
      doneDevEstimateLimit: burnupArrayData.totalEstimate, // this seems wrong
      doneTestCountIncrement: 0, // Assuming no test items in the initial implementation
      doneTestCountLimit: 0, // Assuming no test items in the initial implementation
      doneTestEstimateIncrement: 0, // Assuming no test items in the initial implementation
      doneTestEstimateLimit: 0, // Assuming no test items in the initial implementation
      dateData: burnupArray,
      allJiraInfo: burnupArrayData.allChildJiras.map((jira) => {
        return {
          key: jira.getKey(),
          summary: jira.getSummary(),
          url: jira.getUrl(),
          status: jira.getStatus(),
          originalEstimate: jira.getOriginalEstimate(),
          timeSpent: jira.getTimeSpent(),
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

  private isTestIssue(jira: Jira): boolean {
    return jira.getType() === "Development - Tests (AF)";
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
                const timeSpent = parseInt(item.toString) / (3600 * 7.5); // Convert seconds to days (7.5 hours per day)
                timeSpentMap.set(child.getKey(), timeSpent);
              }
            });
          }
        });
      });

      // Split into dev and test issues
      let doneDevChildren = doneChildren.filter(
        (child) => !this.isTestIssue(child)
      );
      let doneTestChildren = doneChildren.filter((child) =>
        this.isTestIssue(child)
      );
      let inProgressDevChildren = inProgressChildren.filter(
        (child) => !this.isTestIssue(child)
      );
      let inProgressTestChildren = inProgressChildren.filter((child) =>
        this.isTestIssue(child)
      );
      let scopeDevChildren = scopeChildren.filter(
        (child) => !this.isTestIssue(child)
      );
      let scopeTestChildren = scopeChildren.filter((child) =>
        this.isTestIssue(child)
      );

      let doneDevEstimate = doneDevChildren.reduce(
        (acc, child) => acc + (child.getOriginalEstimate() || 0),
        0
      );
      let doneTestEstimate = doneTestChildren.reduce(
        (acc, child) => acc + (child.getOriginalEstimate() || 0),
        0
      );
      let inProgressDevEstimate = inProgressDevChildren.reduce(
        (acc, child) => acc + (child.getOriginalEstimate() || 0),
        0
      );
      let inProgressTestEstimate = inProgressTestChildren.reduce(
        (acc, child) => acc + (child.getOriginalEstimate() || 0),
        0
      );
      let scopeDevEstimate = scopeDevChildren.reduce(
        (acc, child) => acc + (child.getOriginalEstimate() || 0),
        0
      );
      let scopeTestEstimate = scopeTestChildren.reduce(
        (acc, child) => acc + (child.getOriginalEstimate() || 0),
        0
      );

      // Calculate total time spent from the timeSpentMap
      let totalTimeSpent = Array.from(timeSpentMap.values()).reduce(
        (acc, time) => acc + time,
        0
      );

      burnupArray.push({
        date: new Date(date).toISOString().split("T")[0] as TDateISODate,
        doneDevCount: doneDevChildren.length,
        doneDevEstimate,
        doneDevKeys: doneDevChildren.map((child) => child.getKey()),
        doneTestCount: doneTestChildren.length,
        doneTestEstimate,
        doneTestKeys: doneTestChildren.map((child) => child.getKey()),
        inProgressDevCount: inProgressDevChildren.length,
        inProgressDevEstimate,
        inProgressDevKeys: inProgressDevChildren.map((child) => child.getKey()),
        inProgressTestCount: inProgressTestChildren.length,
        inProgressTestEstimate,
        inProgressTestKeys: inProgressTestChildren.map((child) =>
          child.getKey()
        ),
        scopeDevCount: scopeDevChildren.length,
        scopeDevEstimate,
        scopeDevKeys: scopeDevChildren.map((child) => child.getKey()),
        scopeTestCount: scopeTestChildren.length,
        scopeTestEstimate,
        scopeTestKeys: scopeTestChildren.map((child) => child.getKey()),
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
