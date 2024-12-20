import { TDateISODate } from "../../Types";
import Jira from "../Jira";
import JiraRequester, { lastUpdatedKey } from "../JiraRequester";

export type DoneAndScopeCount = {
  //datestring
  date: TDateISODate;
  doneCount: number | null;
  doneEstimate: number | null;
  doneKeys: string[];
  scopeCount: number | null;
  scopeEstimate: number | null;
  scopeKeys: string[];
};

export type DoneAndScopeCountWithForecast = DoneAndScopeCount & {
  doneCountForecast: number | null;
  doneEstimateForecast: number | null;
  doneCountRequired: number | null;
  doneEstimateRequired: number | null;
  futureDoneKeys: string[];
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
  doneCountRequiredIncrement: number; //How many items are required to be completed each day to finish on time
  doneCountRequiredLimit: number; //How many items are required to finish //TODO: Remove
  doneEstimateRequiredIncrement: number; //How many points are required to be completed each day to finish on time
  doneEstimateRequiredLimit: number; //How many points are required to finish //TODO: Remove
  dateData: DoneAndScopeCount[];
};

export default class BurnupGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicBurnupsToDate(epics: Jira[]): Promise<EpicBurnup[]> {
    return await Promise.all(epics.map((jira) => this.getBurnupChart(jira)));
  }

  async getBurnupChart(epic: Jira): Promise<EpicBurnup> {
    let burnupArrayData = await this.getBurnupArrayToDate(epic);

    let burnupArray = burnupArrayData.data;
    let dueDate = epic.getEpicDueDate() || new Date();
    let startDate = epic.getEpicStartDate() || epic.getCreated();
    let daysBetween = Math.floor(
      (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let finalDoneCount = burnupArray[burnupArray.length - 1].doneCount || 0;
    let finalDoneEstimate =
      burnupArray[burnupArray.length - 1].doneEstimate || 0;
    let finalScopeCount = burnupArray[burnupArray.length - 1].scopeCount || 0;
    let finalScopeEstimate =
      burnupArray[burnupArray.length - 1].scopeEstimate || 0;

    let doneCountIncrement = finalDoneCount / daysBetween;
    let doneEstimateIncrement = finalDoneEstimate / daysBetween;
    let doneCountRequiredIncrement = finalScopeCount / daysBetween;
    let doneEstimateRequiredIncrement = finalScopeEstimate / daysBetween;

    return {
      key: epic.getKey(),
      summary: epic.getSummary(),
      startDate: epic.getEpicStartDate() || epic.getCreated(),
      endDate: epic.getEpicDueDate() || new Date(),
      doneCountIncrement,
      doneCountLimit: burnupArrayData.totalCount, //this seems wrong
      doneEstimateIncrement,
      doneEstimateLimit: burnupArrayData.totalEstimate, // this seems wrong
      doneCountRequiredIncrement,
      doneCountRequiredLimit: finalScopeCount,
      doneEstimateRequiredIncrement,
      doneEstimateRequiredLimit: finalDoneEstimate,
      dateData: burnupArray,
    };
  }

  async getEpicBurnupData(query: string): Promise<EpicBurnup[]> {
    let epics = await this.jiraRequester.getQuery(query);
    epics = await Promise.all(
      epics.map((jira) => this.addChildKeysToJira(jira))
    );
    let burnupArrays = await this.getEpicBurnupsToDate(epics);
    return burnupArrays;
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
  }> {
    let startDate = epic.getEpicStartDate() || epic.getCreated();
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    let childJiras = await this.getAllChildrenJiras(epic);
    let childJiraTotalEstimate = childJiras.reduce(
      (sum, child) => sum + (child.getOriginalEstimate() || 0),
      0
    );
    let epicDueDate: Date = epic.getEpicDueDate() || new Date();
    let daysBetween = Math.floor(
      (epicDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let requiredCountPerDay = childJiras.length / daysBetween;
    let requiredEstimatePerDay = childJiraTotalEstimate / daysBetween;
    let requiredCountToday = 0;
    let requiredEstimateToday = 0;

    let burnupArray: DoneAndScopeCount[] = [];
    for (
      let date = startDate;
      date < endDate;
      date.setDate(date.getDate() + 1)
    ) {
      let doneChildren = childJiras.filter((child) => child.isDone(date));
      let existingChildren = await this.getAllChildrenJiras(epic, date);
      let scopeChildren = existingChildren.filter((child) =>
        child.isInScope(date)
      );
      let doneEstimate = doneChildren.reduce(
        (sum, child) => sum + (child.getOriginalEstimate() || 0),
        0
      );
      let scopeEstimate = scopeChildren.reduce(
        (sum, child) => sum + (child.getOriginalEstimate() || 0),
        0
      );
      burnupArray.push({
        date: new Date(date).toISOString().split("T")[0] as TDateISODate,
        doneCount: doneChildren.length,
        doneEstimate,
        doneKeys: doneChildren.map((child) => child.getKey()),
        scopeCount: scopeChildren.length,
        scopeEstimate,
        scopeKeys: scopeChildren.map((child) => child.getKey()),
      });
      requiredCountToday += requiredCountPerDay;
      requiredEstimateToday += requiredEstimatePerDay;
    }

    return {
      data: burnupArray,
      totalCount: childJiras.length,
      totalEstimate: childJiraTotalEstimate,
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
