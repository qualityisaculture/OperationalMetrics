import Jira from '../Jira';
import JiraRequester from '../JiraRequester';

export type BurnupData = {
  epicKey: string;
  epicSummary: string;
  date: Date;
  doneCount: number;
  doneKeys: string[];
  scopeCount: number;
  scopeKeys: string[];
  idealTrend: number;
  forecastTrend: number | null;
};

export type BurnupDataArray = BurnupData[];

export default class BurnupGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicBurnupData(query: string): Promise<BurnupDataArray[]> {
    let jiras = await this.jiraRequester.getQuery(query);
    // let epics = await this.jiraRequester.getFullJiraDataFromKeys(jiraKeys);
    let burnupArrays = await Promise.all(
      jiras.map((jira) => this.getBurnupArray(jira))
    );

    for (let burnupArray of burnupArrays) {
      this.addIdealTrend(burnupArray);
      this.addForecastTrend(burnupArray);
    }

    // let burnupArray: BurnupDataArray = await this.getBurnupArray(epic);
    // this.addIdealTrend(burnupArray);
    // this.addForecastTrend(burnupArray);

    return burnupArrays;
  }

  addForecastTrend(burnupArray: BurnupDataArray) {
    let finalScope = burnupArray[burnupArray.length - 1].scopeCount;
    let today = new Date();
    for (let i = 0; i < burnupArray.length; i++) {
      let item = burnupArray[i];
      if (item.date < today) {
        item.forecastTrend = null;
      } else {
        let daysLeft = burnupArray.length - i;
        let previousDone =
          i > 0
            ? burnupArray[i - 1].forecastTrend || burnupArray[i - 1].doneCount
            : 0;
        let increment = (finalScope - previousDone) / daysLeft;
        item.forecastTrend = previousDone + increment;
      }
    }
  }

  addIdealTrend(burnupArray: BurnupDataArray) {
    let finalScope = burnupArray[burnupArray.length - 1].scopeCount;
    let startDone = burnupArray[0].doneCount;
    let increment = (finalScope - startDone) / (burnupArray.length - 1);
    burnupArray[0].idealTrend = startDone;
    for (let i = 1; i < burnupArray.length; i++) {
      burnupArray[i].idealTrend = burnupArray[i - 1].idealTrend + increment;
    }
  }

  async getBurnupArray(epic: Jira): Promise<BurnupDataArray> {
    let startDate = epic.getEpicStartDate() || epic.getCreated();
    let endDate = epic.getEpicDueDate() || new Date();
    endDate.setDate(endDate.getDate() + 1);
    let childJiras = await this.getAllChildrenJiras(epic);

    let burnupArray: BurnupDataArray = [];
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
      burnupArray.push({
        epicKey: epic.getKey(),
        epicSummary: epic.getSummary(),
        date: new Date(date),
        doneCount: doneChildren.length,
        doneKeys: doneChildren.map((child) => child.getKey()),
        scopeCount: scopeChildren.length,
        scopeKeys: scopeChildren.map((child) => child.getKey()),
        idealTrend: 0,
        forecastTrend: 0,
      });
    }
    return burnupArray;
  }

  async getAllChildrenJiras(jira: Jira, date?: Date): Promise<Jira[]> {
    let childrenKeys = jira.getChildrenKeys(date);
    let jiras = await this.jiraRequester.getFullJiraDataFromKeys(childrenKeys);
    return jiras;
  }
}
