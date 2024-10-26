import JiraRequester from "./JiraRequester";

export default class BurnupGraphManager {
  jiraRequester: JiraRequester;
  constructor(jiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getEpicBurnupData(epicKey: string) {
    let epic = await this.jiraRequester.getJira(epicKey);
    let childJiras = await this.getAllChildrenJiras(epic);
    console.log(childJiras.map(child => child.getKey()));

    let startDate = epic.created;
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);

    let doneByDateArray: { date: Date; count: number, doneKeys: string[] }[] = [];
    for (let date = startDate; date < endDate; date.setDate(date.getDate() + 1)) {
      let doneChildren = childJiras.filter(child => child.isDone(date));
      doneByDateArray.push({ date: new Date(date), count: doneChildren.length, doneKeys: doneChildren.map(child => child.getKey()) });
    }
    return doneByDateArray;
  }

  async getAllChildrenJiras(jira) {
    let children = jira.getChildrenKeys();
    let childPromises = children.map((childKey) => {
      return this.jiraRequester.getJira(childKey);
    });
    return await Promise.all(childPromises);
  }
}