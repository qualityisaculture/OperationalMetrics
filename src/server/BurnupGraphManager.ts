import Jira from './Jira';
import JiraRequester from './JiraRequester';

export type BurnupData = {
  date: Date;
  doneCount: number;
  doneKeys: string[];
  scopeCount: number;
  scopeKeys: string[];
};

export type BurnupDataArray = BurnupData[];

export default class BurnupGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicBurnupData(epicKey: string): Promise<BurnupDataArray> {
    let epic = await this.jiraRequester.getJira(epicKey);
    let childJiras = await this.getAllChildrenJiras(epic);
    let startDate = epic.getEpicStartDate() || epic.getCreated();
    let endDate = epic.getEpicDueDate() || new Date();
    endDate.setDate(endDate.getDate() + 1);

    let burnupArray: BurnupDataArray = [];
    for (
      let date = startDate;
      date < endDate;
      date.setDate(date.getDate() + 1)
    ) {
      let doneChildren = childJiras.filter((child) => child.isDone(date));
      let existingChildren = await this.getAllChildrenJiras(epic, date);
      let scopeChildren = existingChildren.filter((child) => child.isInScope(date));
      burnupArray.push({
        date: new Date(date),
        doneCount: doneChildren.length,
        doneKeys: doneChildren.map((child) => child.getKey()),
        scopeCount: scopeChildren.length,
        scopeKeys: scopeChildren.map((child) => child.getKey()),
      });
    }
    return burnupArray;
  }

  async getAllChildrenJiras(jira: Jira, date?: Date) {
    let children = jira.getChildrenKeys(date);
    let childPromises = children.map((childKey) => {
      return this.jiraRequester.getJira(childKey);
    });
    return await Promise.all(childPromises);
  }
}
