import { TDateISODate } from "../../Types";
import Jira from "../Jira";
import JiraRequester from "../JiraRequester";

export type EpicBurnupData = {
  //datestring
  date: TDateISODate;
  doneCount: number | null;
  doneEstimate: number | null;
  doneKeys: string[];
  scopeCount: number | null;
  scopeEstimate: number | null;
  scopeKeys: string[];
};

export type ExtendedEpicBurnupData = EpicBurnupData & {
  doneCountForecast: number | null;
  doneEstimateForecast: number | null;
  doneCountRequired: number | null;
  doneEstimateRequired: number | null;
  futureDoneKeys: string[];
};

export type EpicBurnups = {
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
  dateData: EpicBurnupData[];
};

export default class BurnupGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicBurnupsToDate(jiras: Jira[]): Promise<EpicBurnups[]> {
    let burnupArrays: EpicBurnups[] = await Promise.all(
      jiras.map((jira) => {
        return this.getBurnupArrayToDate(jira).then((burnupArrayData) => {
          let burnupArray = burnupArrayData.data;
          let dueDate = jira.getEpicDueDate() || new Date();
          let startDate = jira.getEpicStartDate() || jira.getCreated();
          let daysBetween = Math.floor(
            (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          let doneCountIncrement =
            (burnupArray[burnupArray.length - 1].doneCount || 0) /
            burnupArray.length;
          let doneEstimateIncrement =
            (burnupArray[burnupArray.length - 1].doneEstimate || 0) /
            burnupArray.length;
          let doneCountRequiredIncrement =
            (burnupArray[burnupArray.length - 1].scopeCount || 0) / daysBetween;
          let doneEstimateRequiredIncrement =
            (burnupArray[burnupArray.length - 1].scopeEstimate || 0) /
            daysBetween;

          return {
            key: jira.getKey(),
            summary: jira.getSummary(),
            startDate: jira.getEpicStartDate() || jira.getCreated(),
            endDate: jira.getEpicDueDate() || new Date(),
            doneCountIncrement,
            doneCountLimit: burnupArrayData.totalCount, //this seems wrong
            doneEstimateIncrement,
            doneEstimateLimit: burnupArrayData.totalEstimate, // this seems wrong
            doneCountRequiredIncrement,
            doneCountRequiredLimit:
              burnupArray[burnupArray.length - 1].scopeCount || 0,
            doneEstimateRequiredIncrement,
            doneEstimateRequiredLimit:
              burnupArray[burnupArray.length - 1].scopeEstimate || 0,
            dateData: burnupArray,
          };
        });
      })
    );
    return burnupArrays;
  }

  async getEpicBurnupData(query: string): Promise<EpicBurnups[]> {
    let jiras = await this.jiraRequester.getQuery(query);
    let burnupArrays = await this.getEpicBurnupsToDate(jiras);
    return burnupArrays;
  }

  async getBurnupArrayToDate(epic: Jira): Promise<{
    data: EpicBurnupData[];
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
    console.log(
      epic.getKey(),
      childJiras.length,
      childJiras.map((jira) => jira.getKey())
    );
    let daysBetween = Math.floor(
      (epicDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let requiredCountPerDay = childJiras.length / daysBetween;
    let requiredEstimatePerDay = childJiraTotalEstimate / daysBetween;
    let requiredCountToday = 0;
    let requiredEstimateToday = 0;

    let burnupArray: EpicBurnupData[] = [];
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
    let childrenKeys = jira.getChildrenKeys(date);
    let jiras = await this.jiraRequester.getFullJiraDataFromKeys(childrenKeys);
    return jiras;
  }
}
