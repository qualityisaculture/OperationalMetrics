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
  futureDoneCount: number | null;
  futureDoneEstimate: number | null;
  futureDoneKeys: string[];
};

export type EpicBurnups = {
  key: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  doneCountIncrement: number;
  doneCountLimit: number;
  doneEstimateIncrement: number;
  doneEstimateLimit: number;
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

          let doneCountIncrement =
            (burnupArray[burnupArray.length - 1].doneCount || 0) /
            burnupArray.length;
          let doneEstimateIncrement =
            (burnupArray[burnupArray.length - 1].doneEstimate || 0) /
            burnupArray.length;

          return {
            key: jira.getKey(),
            summary: jira.getSummary(),
            startDate: jira.getEpicStartDate() || jira.getCreated(),
            endDate: jira.getEpicDueDate() || new Date(),
            doneCountIncrement,
            doneCountLimit: burnupArrayData.totalCount,
            doneEstimateIncrement,
            doneEstimateLimit: burnupArrayData.totalEstimate,
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
    }
    let finalChildrenInScope = await this.getAllChildrenJiras(epic);
    console.log(finalChildrenInScope);
    return {
      data: burnupArray,
      totalCount: finalChildrenInScope.length,
      totalEstimate: finalChildrenInScope.reduce(
        (sum, child) => sum + (child.getOriginalEstimate() || 0),
        0
      ),
    };
  }

  async getAllChildrenJiras(jira: Jira, date?: Date): Promise<Jira[]> {
    let childrenKeys = jira.getChildrenKeys(date);
    let jiras = await this.jiraRequester.getFullJiraDataFromKeys(childrenKeys);
    return jiras;
  }
}
