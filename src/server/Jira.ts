import { history, historyItem, omHistoryItem } from "./JiraAPITypes";
import { lastUpdatedKey } from "./JiraRequester";
import { getWorkHoursBetween } from "./Utils";
export type JiraJsonFields = {
  created: string;
  components: { name: string }[];
  customfield_10015?: string; // Epic Start Date
  duedate?: string;
  fixVersions: { name: string }[];
  issuetype: { name: string };
  labels: string[];
  parent?: {
    key: string;
    fields: { issuetype: { name: string }; summary: string };
  };
  priority: { name: string };
  resolution: string;
  resolutiondate: string;
  status: { name: string };
  summary: string;
  timeoriginalestimate?: number;
  timespent?: number;
};
export type JiraJson = {
  key: string;
  fields: JiraJsonFields;
  changelog?: { histories: any[] };
};

export default class Jira {
  fields: {
    key: string;
    created: string;
    components: { name: string }[];
    customfield_10015?: string; // Epic Start Date
    duedate?: string;
    fixVersions: { name: string }[];
    issuetype: { name: string };
    labels: string[];
    epicKey?: string;
    epicName?: string;
    initiativeKey?: string;
    initiativeName?: string;
    parentKey?: string; //for subtasks
    parentName?: string; //for subtasks
    priority: { name: string };
    resolution: string;
    resolutiondate: string;
    status: { name: string };
    summary: string;
    timeoriginalestimate?: number;
    timespent?: number;
    url: string;
  };
  changelog: { histories: any[] };
  created: Date;
  histories: any[];
  statusChanges: any[];
  constructor(json: JiraJson) {
    const domain = process.env.JIRA_DOMAIN;
    this.created = new Date(json.fields.created);
    this.fields = {
      key: json.key,
      created: json.fields.created,
      components: json.fields.components,
      customfield_10015: json.fields.customfield_10015,
      duedate: json.fields.duedate,
      fixVersions: json.fields.fixVersions,
      issuetype: json.fields.issuetype,
      labels: json.fields.labels,
      priority: json.fields.priority,
      resolution: json.fields.resolution,
      resolutiondate: json.fields.resolutiondate,
      status: json.fields.status,
      summary: json.fields.summary,
      timeoriginalestimate: json.fields.timeoriginalestimate,
      timespent: json.fields.timespent,
      url: `${domain}/browse/${json.key}`,
    };
    if (
      json.fields.parent &&
      json.fields.parent.fields.issuetype.name === "Epic"
    ) {
      this.fields.epicKey = json.fields.parent.key;
      this.fields.epicName = json.fields.parent.fields.summary;
    } else if (
      json.fields.parent &&
      json.fields.parent.fields.issuetype.name === "Initiative"
    ) {
      this.fields.initiativeKey = json.fields.parent.key;
      this.fields.initiativeName = json.fields.parent.fields.summary;
    } else if (json.fields.parent) {
      this.fields.parentKey = json.fields.parent.key;
      this.fields.parentName = json.fields.parent.fields.summary;
    }
    this.changelog = json.changelog || { histories: [] };
    this.histories =
      json.changelog && json.changelog.histories
        ? this.getHistoriesInOrder(json.changelog.histories)
        : [];
    this.statusChanges = this.loadStatusChanges();
  }
  getKey() {
    return this.fields.key;
  }
  getCreated() {
    return new Date(this.created);
  }
  getComponents() {
    return this.fields.components.map((component) => {
      return component.name;
    });
  }
  getEpicKey() {
    return this.fields.epicKey ? this.fields.epicKey : null;
  }
  getEpicName() {
    return this.fields.epicName ? this.fields.epicName : null;
  }
  getFixVersions() {
    return this.fields.fixVersions.map((version) => {
      return version.name;
    });
  }
  getInitiativeKey() {
    return this.fields.initiativeKey ? this.fields.initiativeKey : null;
  }
  getInitiativeName() {
    return this.fields.initiativeName ? this.fields.initiativeName : null;
  }
  getLabels() {
    return this.fields.labels || [];
  }
  getParentKey() {
    return this.fields.parentKey ? this.fields.parentKey : null;
  }
  getParentName() {
    return this.fields.parentName ? this.fields.parentName : null;
  }
  getPriority() {
    return this.fields.priority.name;
  }
  getResolution() {
    return this.fields.resolution;
  }
  getResolved() {
    return new Date(this.fields.resolutiondate);
  }
  getSummary() {
    return this.fields.summary;
  }
  getType() {
    return this.fields.issuetype.name;
  }
  getOriginalEstimate(): number | null {
    return this.fields.timeoriginalestimate || null;
  }
  getTimeSpent(): number | null {
    return this.fields.timespent || null;
  }
  getUrl() {
    return this.fields.url;
  }
  getEpicStartDate(): Date | null {
    if (!this.fields.customfield_10015) {
      return null;
    }
    return new Date(this.fields.customfield_10015);
  }
  getEpicDueDate(): Date | null {
    if (!this.fields.duedate) {
      return null;
    }
    return new Date(this.fields.duedate);
  }
  getChildrenKeys(date?: Date): lastUpdatedKey[] {
    if (!this.changelog || !this.changelog.histories) {
      return [];
    }
    let children = new Set<string>();

    let chronologicalEpicChildItems = this.getHistoriesItems("Epic Child");
    chronologicalEpicChildItems.forEach((item) => {
      if (item.created && date && item.created > date) {
        return Array.from(children);
      }
      if (item.toString) {
        children.add(item.toString);
      } else {
        children.delete(item.fromString);
      }
    });
    return Array.from(children).map((key) => {
      return { key }
    });
  }

  getHistoriesItems(field): omHistoryItem[] {
    let epicChildItems = this.histories
      .map((history) => {
        let items: (historyItem & { created?: Date })[] =
          this.filterHistoryItems(history, field);
        items.forEach((item) => {
          let date = new Date(history.created);
          item.created = date;
        });
        return items;
      })
      .flat();
    return epicChildItems as omHistoryItem[];
  }

  filterHistoryItems(history: history, field): historyItem[] {
    return history.items.filter((item) => {
      return item.field === field;
    });
  }

  getHistoriesInOrder(unsortedHistories) {
    return unsortedHistories.sort((a, b) => {
      return new Date(a.created).getTime() - new Date(b.created).getTime();
    });
  }

  loadStatusChanges() {
    let statusItems = this.getHistoriesItems("status");
    if (statusItems.length === 0) {
      return [{ date: this.created, status: this.fields.status.name }];
    }
    let statusChanges = statusItems.map((item) => {
      return { date: new Date(item.created), status: item.toString };
    });
    statusChanges.splice(0, 0, {
      date: this.created,
      status: statusItems[0].fromString,
    });
    return statusChanges;
  }

  getStatus(date?: Date): string {
    if (!date) {
      return this.fields.status.name;
    }
    if (date < this.created) {
      return "NOT_CREATED_YET";
    }
    for (let i = 0; i < this.statusChanges.length; i++) {
      if (this.statusChanges[i].date > date) {
        return this.statusChanges[i - 1].status;
      }
    }
    return this.statusChanges[this.statusChanges.length - 1].status;
  }

  getStatuses(): string[] {
    let statusSet = new Set<string>();
    this.statusChanges.forEach((change) => {
      statusSet.add(change.status);
    });
    return Array.from(statusSet).sort();
  }

  getStatusTimes(): { status: string; time: number }[] {
    let statuses = this.getStatuses();
    let statusMap = new Map<string, number>();
    statuses.forEach((status) => {
      statusMap.set(status, 0);
    });
    let previousTime = this.statusChanges[0].date;
    for (let i = 1; i < this.statusChanges.length; i++) {
      let status = this.statusChanges[i - 1].status;
      let time = this.statusChanges[i].date;
      let duration = getWorkHoursBetween(previousTime, time) * 60 * 60 * 1000;
      let previousDuration = statusMap.get(status) || 0;
      statusMap.set(status, previousDuration + duration);
      previousTime = time;
    }
    let finalTime = new Date();
    let finalDuration =
      getWorkHoursBetween(previousTime, finalTime) * 60 * 60 * 1000;
    let finalStatus = this.getStatus(finalTime);
    let finalPreviousDuration = statusMap.get(finalStatus) || 0;
    statusMap.set(finalStatus, finalPreviousDuration + finalDuration);
    return Array.from(statusMap).map(([status, time]) => {
      return { status, time };
    });
  }

  isDone(date?: Date) {
    return this.getStatus(date) === "Done";
  }

  isInScope(date?: Date) {
    let descopedStatuses = ["Cancelled"];
    return !descopedStatuses.includes(this.getStatus(date));
  }

  existsOn(date: Date) {
    return date >= this.created;
  }
}
