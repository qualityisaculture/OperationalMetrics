import { IssueInfo, SprintIssueList } from "./graphManagers/GraphManagerTypes";
import Jira from "./Jira";

export function inWorkDay(date: Date): boolean {
  if (date.getDay() == 6 || date.getDay() == 0) {
    return false;
  }
  if (date.getUTCHours() < 9) {
    return false;
  }
  if (date.getUTCHours() >= 17) {
    return false;
  }
  return true;
}

//Not accurate to the minute, but good enough for this use case
export function getWorkDaysBetween(date1: Date, date2: Date): number {
  if (date2.getTime() - date1.getTime() < 60 * 60 * 1000) {
    return 0;
  }
  let workHours = 0;
  let currentDate = new Date(date1);
  while (currentDate < date2) {
    if (inWorkDay(currentDate)) {
      workHours++;
    }
    currentDate.setUTCHours(currentDate.getUTCHours() + 1);
  }
  return workHours / 8;
}

export function getSprintIssueListsBySprint(
  jiras: Jira[],
  startDate: Date
): SprintIssueList[] {
  let issuesBySprint = getIssuesBySprint(jiras, startDate);
  let sprintIssueLists = issuesBySprint.map((sprint) => {
    return {
      sprintStartingDate: sprint.sprintStartingDate,
      issueList: sprint.issues.map((jira) => getIssueInfoFromJira(jira)),
    };
  });
  return sprintIssueLists;
}

export function getIssuesBySprint(
  jiras: Jira[],
  startDate: Date
): { sprintStartingDate: Date; issues: Jira[] }[] {
  let sprints: { sprintStartingDate: Date; issues: Jira[] }[] = [];
  let currentSprintStartDate = new Date(startDate);
  currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 14);
  while (jiras.length > 0) {
    let twoWeeksAgo = new Date(currentSprintStartDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    let jirasInSprint = jiras.filter(
      (jira) => jira.getResolved() > twoWeeksAgo
    );
    sprints.push({
      sprintStartingDate: twoWeeksAgo,
      issues: jirasInSprint,
    });
    jiras = jiras.filter((jira) => jira.getResolved() <= twoWeeksAgo);
    currentSprintStartDate = twoWeeksAgo;
  }
  return sprints;
}

export function getIssueInfoFromJira(jira: Jira): IssueInfo {
  let initiativeKey = jira.getInitiativeKey();
  let initiativeName = jira.getInitiativeName();
  if (initiativeKey == "NO_INITIATIVE") {
    if (jira.getType() === "Bug") {
      initiativeKey = "Bug";
      initiativeName = "Bug";
    } else if (jira.getEpicKey()) {
      initiativeKey = "EPIC";
      initiativeName = "NOINITIATIVE";
    }
  }
  let labels = jira.getLabels();
  if (labels.includes("corrected")) {
    initiativeKey = "CORRECTED";
    initiativeName = "CORRECTED";
  }
  if (jira.getEpicKey()) {
    const epicLabels = jira.getEpicLabels();
    if (epicLabels.includes("corrected")) {
      initiativeKey = "EPIC_CORRECTED";
      initiativeName = "EPIC_CORRECTED";
    }
  }
  return {
    key: jira.getKey(),
    summary: jira.getSummary(),
    status: jira.getStatus(),
    type: jira.getType(),
    created: jira.getCreated().toISOString(),
    resolved: jira.getResolved().toISOString(),
    resolution: jira.getResolution(),
    epicKey: jira.getEpicKey(),
    epicName: jira.getEpicName(),
    initiativeKey: initiativeKey,
    initiativeName: initiativeName,
    labels: jira.getLabels(),
    priority: jira.getPriority(),
    components: jira.getComponents(),
    fixVersions: jira.getFixVersions(),
    url: jira.getUrl(),
    timeoriginalestimate: jira.getOriginalEstimate(),
    timespent: jira.getTimeSpent(),
    account: jira.getAccount(),
  };
}
