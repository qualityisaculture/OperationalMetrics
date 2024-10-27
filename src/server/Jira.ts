import { history, historyItem, omHistoryItem } from "./JiraAPITypes";

type JiraJson = {
  key: string;
  fields: { created: string; status: { name: string }, customfield_10015?: string, duedate?: string };
  changelog?: { histories: any[] };
};
export default class Jira {
  json: JiraJson;
  created: Date;
  histories: any[];
  statusChanges: any[];
  constructor(json: JiraJson) {
    this.json = json;
    this.created = new Date(json.fields.created);
    this.histories =
      json.changelog && json.changelog.histories
        ? this.getHistoriesInOrder(json.changelog.histories)
        : [];
    this.statusChanges = this.loadStatusChanges();
  }
  getKey() {
    return this.json.key;
  }
  getCreated() {
    return new Date(this.created);
  }
  getEpicStartDate(): Date | null {
    if (!this.json.fields.customfield_10015) {
      return null;
    }
    return new Date(this.json.fields.customfield_10015);
  }
  getEpicDueDate(): Date | null {
    if (!this.json.fields.duedate) {
      return null;
    }
    return new Date(this.json.fields.duedate);
  }
  getChildrenKeys(date?: Date): string[] {
    if (!this.json.changelog || !this.json.changelog.histories) {
      return [];
    }
    let children = new Set<string>();

    let chronologicalEpicChildItems = this.getHistoriesItems('Epic Child');
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
    return Array.from(children);
  }

  getHistoriesItems(field): omHistoryItem[] {
    let epicChildItems = this.histories
      .map((history) => {
        
        let items: (historyItem & {created?: Date})[] = this.filterHistoryItems(history, field);
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
    let statusItems = this.getHistoriesItems('status');
    if (statusItems.length === 0) {
      return [{ date: this.created, status: this.json.fields.status.name }];
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

  getStatus(date?: Date) {
    if (!date) {
      return this.json.fields.status.name;
    }
    if (date < this.created) {
      return null;
    }
    for (let i = 0; i < this.statusChanges.length; i++) {
      if (this.statusChanges[i].date > date) {
        return this.statusChanges[i - 1].status;
      }
    }
    return this.statusChanges[this.statusChanges.length - 1].status;
  }

  isDone(date?: Date) {  
    return this.getStatus(date) === 'Done';
  }

  isInScope(date?: Date) {
    let descopedStatuses = ['Cancelled'];
    return !descopedStatuses.includes(this.getStatus(date));
  }

  existsOn(date: Date) {
    return date >= this.created;
  }
}
