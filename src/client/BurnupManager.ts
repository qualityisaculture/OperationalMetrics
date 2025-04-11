import {
  DoneAndScopeCount,
  EpicBurnup,
} from "../server/graphManagers/BurnupGraphManager";
import { MinimumIssueInfo, TDateISODate } from "../Types";
import { GoogleDataTableType } from "./LineChart";

export function extendEpicBurnup(
  epicBurnups: EpicBurnup,
  earliestDate: Date,
  lastDate: Date
): DoneAndScopeCount[] {
  if (earliestDate > epicBurnups.startDate) {
    throw new Error("Earliest date is after start date");
  }
  if (lastDate < epicBurnups.endDate) {
    throw new Error("Last date is before end date");
  }
  let extendedBurnupDataArray: DoneAndScopeCount[] = [];
  let currentDate = new Date(earliestDate);
  while (currentDate <= lastDate) {
    let burnupData: DoneAndScopeCount | undefined = epicBurnups.dateData.find(
      (item) => item.date === currentDate.toISOString().split("T")[0]
    );
    if (burnupData) {
      extendedBurnupDataArray.push(burnupData);
    } else {
      if (currentDate < epicBurnups.startDate) {
        extendedBurnupDataArray.push({
          date: currentDate.toISOString().split("T")[0] as TDateISODate,
          doneDevCount: null,
          doneDevEstimate: null,
          doneDevKeys: [],
          doneTestCount: null,
          doneTestEstimate: null,
          doneTestKeys: [],
          inProgressDevCount: null,
          inProgressDevEstimate: null,
          inProgressDevKeys: [],
          inProgressTestCount: null,
          inProgressTestEstimate: null,
          inProgressTestKeys: [],
          scopeDevCount: null,
          scopeDevEstimate: null,
          scopeDevKeys: [],
          scopeTestCount: null,
          scopeTestEstimate: null,
          scopeTestKeys: [],
          timeSpent: null,
        });
      } else {
        let lastData = epicBurnups.dateData[epicBurnups.dateData.length - 1];
        extendedBurnupDataArray.push({
          ...lastData,
          date: currentDate.toISOString().split("T")[0] as TDateISODate,
        });
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return extendedBurnupDataArray;
}

export function getGoogleDataTableFromMultipleBurnupData(
  filteredEpics: EpicBurnup[],
  estimate: boolean,
  earliestDate: Date,
  lastDate: Date
): GoogleDataTableType[] {
  let allJirasMap = new Map<string, MinimumIssueInfo>();
  filteredEpics.forEach((epic) => {
    epic.allJiraInfo.forEach((jira) => {
      allJirasMap.set(jira.key, jira);
    });
  });
  let extendedBurnupDataArray = filteredEpics.map((item) => {
    return extendEpicBurnup(item, earliestDate, lastDate);
  });
  let previousIssuesCompleted: DoneAndScopeCount[] = [];
  let allDates: GoogleDataTableType[] = [];

  for (
    let d = new Date(earliestDate);
    d <= new Date(lastDate);
    d.setDate(d.getDate() + 1)
  ) {
    let dayAfterDate = new Date(d);
    dayAfterDate.setDate(dayAfterDate.getDate() + 1);
    let issuesExistingToday = extendedBurnupDataArray.map(
      (doneAndScopeCountArray) => {
        return getDataBetweenDates(doneAndScopeCountArray, d, dayAfterDate);
      }
    );
    let sumDoneDev = reduceDSAField(
      issuesExistingToday,
      estimate ? "doneDevEstimate" : "doneDevCount"
    );
    let sumInProgressDev = reduceDSAField(
      issuesExistingToday,
      estimate ? "inProgressDevEstimate" : "inProgressDevCount"
    );
    let sumScopeDev = reduceDSAField(
      issuesExistingToday,
      estimate ? "scopeDevEstimate" : "scopeDevCount"
    );
    let sumDoneTest = reduceDSAField(
      issuesExistingToday,
      estimate ? "doneTestEstimate" : "doneTestCount"
    );
    let sumInProgressTest = reduceDSAField(
      issuesExistingToday,
      estimate ? "inProgressTestEstimate" : "inProgressTestCount"
    );
    let sumScopeTest = reduceDSAField(
      issuesExistingToday,
      estimate ? "scopeTestEstimate" : "scopeTestCount"
    );
    let sumTimeSpent = reduceDSAField(issuesExistingToday, "timeSpent");

    if (sumDoneDev === 0) {
      sumDoneDev = null;
    }
    if (sumInProgressDev === 0) {
      sumInProgressDev = null;
    }
    if (sumDoneTest === 0) {
      sumDoneTest = null;
    }
    if (sumInProgressTest === 0) {
      sumInProgressTest = null;
    }
    if (sumTimeSpent === 0) {
      sumTimeSpent = null;
    }
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (new Date(d) > tomorrow) {
      sumDoneDev = null;
      sumInProgressDev = null;
      sumDoneTest = null;
      sumInProgressTest = null;
      sumTimeSpent = null;
    }

    let allNewIssuesCompletedToday = new Set<string>();
    let allNewIssuesInProgressToday = new Set<string>();
    let allUncompletedScope = new Set<string>();
    let allNewScopeToday = new Set<string>();
    issuesExistingToday.forEach((item) => {
      item.scopeDevKeys.forEach((key) => {
        allNewScopeToday.add(key);
        allUncompletedScope.add(key);
      });
      item.doneDevKeys.forEach((key) => {
        allNewIssuesCompletedToday.add(key);
        allUncompletedScope.delete(key);
      });
      item.inProgressDevKeys.forEach((key) => {
        allNewIssuesInProgressToday.add(key);
      });
    });
    previousIssuesCompleted.forEach((item) => {
      item.doneDevKeys.forEach((key) => {
        allNewIssuesCompletedToday.delete(key);
      });
      item.inProgressDevKeys?.forEach((key) => {
        allNewIssuesInProgressToday.delete(key);
      });
      item.scopeDevKeys.forEach((key) => {
        allNewScopeToday.delete(key);
      });
    });
    function getJiraString(key: string) {
      let jira = allJirasMap.get(key);
      if (jira) {
        const formatTime = (days: number | null) => {
          if (days === null) return "not set";
          // Convert to total hours first
          const totalHours = days * 7.5;
          // Then calculate whole days and remaining hours
          const wholeDays = Math.floor(days);
          const remainingHours = Math.round(totalHours % 7.5);
          return `${wholeDays > 0 ? `${wholeDays}d` : ""}${remainingHours > 0 ? ` ${remainingHours}h` : wholeDays === 0 ? "0d" : ""}`;
        };

        const estimate = formatTime(jira.originalEstimate);
        const timeSpent = formatTime(jira.timeSpent);
        const timeInfo = ` (Est: ${estimate}, Actual: ${timeSpent})`;

        return `<a href="${jira.url}">${key}</a> - ${jira.summary} - ${jira.status}${timeInfo}`;
      }
      return key;
    }

    let clickData = "";
    clickData += "<h3>Issues done previously</h3>";
    previousIssuesCompleted.forEach((item) => {
      item.doneDevKeys.forEach((key) => {
        clickData += `${getJiraString(key)}<br>`;
      });
    });
    clickData += "<h3>Issues done today</h3>";
    allNewIssuesCompletedToday.forEach((key) => {
      clickData += `${getJiraString(key)}<br>`;
    });
    clickData += "<h3>Issues in progress</h3>";
    allNewIssuesInProgressToday.forEach((key) => {
      clickData += `${getJiraString(key)}<br>`;
    });
    clickData += "<h3>Scope added today</h3>";
    allNewScopeToday.forEach((key) => {
      clickData += `${getJiraString(key)}<br>`;
    });
    clickData += "<h3>Uncompleted scope</h3>";
    allUncompletedScope.forEach((key) => {
      clickData += `${getJiraString(key)}<br>`;
    });
    previousIssuesCompleted = issuesExistingToday;

    allDates.push({
      data: [
        new Date(d),
        sumDoneDev,
        sumInProgressDev,
        sumScopeDev,
        sumDoneTest,
        sumInProgressTest,
        sumScopeTest,
        sumTimeSpent,
      ],
      clickData,
    });
  }
  return allDates;
}

export function getDataBetweenDates(
  doneAndScopeArray: DoneAndScopeCount[],
  today: Date,
  tomorrow: Date
): DoneAndScopeCount {
  let dataOnDate = doneAndScopeArray.find(
    (item) => new Date(item.date) >= today && new Date(item.date) < tomorrow
  );
  if (dataOnDate) {
    return dataOnDate;
  }
  let lastData = doneAndScopeArray[doneAndScopeArray.length - 1];
  if (today > new Date(lastData.date)) {
    return {
      date: today.toISOString().split("T")[0] as TDateISODate,
      doneDevCount: lastData.doneDevCount,
      doneDevEstimate: lastData.doneDevEstimate,
      doneDevKeys: lastData.doneDevKeys,
      doneTestCount: lastData.doneTestCount,
      doneTestEstimate: lastData.doneTestEstimate,
      doneTestKeys: lastData.doneTestKeys,
      inProgressDevCount: lastData.inProgressDevCount,
      inProgressDevEstimate: lastData.inProgressDevEstimate,
      inProgressDevKeys: lastData.inProgressDevKeys,
      inProgressTestCount: lastData.inProgressTestCount,
      inProgressTestEstimate: lastData.inProgressTestEstimate,
      inProgressTestKeys: lastData.inProgressTestKeys,
      scopeDevCount: lastData.scopeDevCount,
      scopeDevEstimate: lastData.scopeDevEstimate,
      scopeDevKeys: lastData.scopeDevKeys,
      scopeTestCount: lastData.scopeTestCount,
      scopeTestEstimate: lastData.scopeTestEstimate,
      scopeTestKeys: lastData.scopeTestKeys,
      timeSpent: lastData.timeSpent,
    };
  }
  return {
    date: today.toISOString().split("T")[0] as TDateISODate,
    doneDevCount: null,
    doneDevEstimate: null,
    doneDevKeys: [],
    doneTestCount: null,
    doneTestEstimate: null,
    doneTestKeys: [],
    inProgressDevCount: null,
    inProgressDevEstimate: null,
    inProgressDevKeys: [],
    inProgressTestCount: null,
    inProgressTestEstimate: null,
    inProgressTestKeys: [],
    scopeDevCount: null,
    scopeDevEstimate: null,
    scopeDevKeys: [],
    scopeTestCount: null,
    scopeTestEstimate: null,
    scopeTestKeys: [],
    timeSpent: null,
  };
}

export function reduceDSAField(
  array: DoneAndScopeCount[],
  field: string
): number | null {
  return array.reduce((acc, val) => {
    return acc + val[field];
  }, 0);
}

export function getSelectedEpics(
  allEpicsData: EpicBurnup[],
  selectedEpics: number[]
) {
  return selectedEpics
    ? allEpicsData.filter((item, index) => selectedEpics.includes(index))
    : allEpicsData;
}

export function getEarliestDate(allEpicsData: EpicBurnup[]) {
  return allEpicsData.reduce((acc, val) => {
    return acc < val.startDate ? acc : val.startDate;
  }, new Date());
}

export function getLastDate(allEpicsData: EpicBurnup[]) {
  let lastDateInJiras = allEpicsData.reduce((acc, val) => {
    return acc > new Date(val.endDate) ? acc : new Date(val.endDate);
  }, new Date());
  let today = new Date();
  return lastDateInJiras > today ? lastDateInJiras : today;
}

export function getGapDataFromBurnupData(
  burnupData: GoogleDataTableType[]
): GoogleDataTableType[] {
  return burnupData.map((dataPoint) => {
    const [
      date,
      doneDev,
      inProgressDev,
      scopeDev,
      doneTest,
      inProgressTest,
      scopeTest,
      timeSpent,
    ] = dataPoint.data;
    const gapToDoneDev =
      scopeDev === null || doneDev === null ? null : scopeDev - doneDev;
    const gapToInProgressDev =
      scopeDev === null || inProgressDev === null
        ? null
        : scopeDev - inProgressDev;
    const gapToDoneTest =
      scopeTest === null || doneTest === null ? null : scopeTest - doneTest;
    const gapToInProgressTest =
      scopeTest === null || inProgressTest === null
        ? null
        : scopeTest - inProgressTest;

    return {
      data: [
        date,
        gapToDoneDev,
        gapToInProgressDev,
        null,
        gapToDoneTest,
        gapToInProgressTest,
        null,
        timeSpent,
      ],
      clickData: dataPoint.clickData,
    };
  });
}
