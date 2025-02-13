import {
  DoneAndScopeCount,
  DoneAndScopeCountWithForecast,
  EpicBurnup,
} from "../server/graphManagers/BurnupGraphManager";
import { MinimumIssueInfo, TDateISODate } from "../Types";
import { GoogleDataTableType } from "./LineChart";

export function extendEpicBurnup(
  epicBurnups: EpicBurnup,
  earliestDate: Date,
  lastDate: Date
): DoneAndScopeCountWithForecast[] {
  if (earliestDate > epicBurnups.startDate) {
    throw new Error("Earliest date is after start date");
  }
  if (lastDate < epicBurnups.endDate) {
    throw new Error("Last date is before end date");
  }
  let extendedBurnupDataArray: DoneAndScopeCountWithForecast[] = [];
  let currentDate = new Date(earliestDate);
  let doneCountForecast = 0;
  let doneEstimateForecast = 0;
  while (currentDate <= lastDate) {
    let burnupData: DoneAndScopeCount | undefined = epicBurnups.dateData.find(
      (item) => item.date === currentDate.toISOString().split("T")[0]
    );
    if (burnupData) {
      let extendedBurnupData: DoneAndScopeCountWithForecast = {
        ...burnupData,
        doneCountForecast: doneCountForecast,
        doneEstimateForecast: doneEstimateForecast,
        futureDoneKeys: [],
      };
      doneCountForecast += epicBurnups.doneCountIncrement;
      doneEstimateForecast += epicBurnups.doneEstimateIncrement;
      extendedBurnupDataArray.push(extendedBurnupData);
    } else {
      if (currentDate < epicBurnups.startDate) {
        extendedBurnupDataArray.push({
          date: currentDate.toISOString().split("T")[0] as TDateISODate,
          doneCount: null,
          doneEstimate: null,
          doneKeys: [],
          scopeCount: null,
          scopeEstimate: null,
          scopeKeys: [],
          doneCountForecast: null,
          doneEstimateForecast: null,
          futureDoneKeys: [],
          doneCountRequired: null,
          doneEstimateRequired: null,
        });
      } else if (currentDate > new Date()) {
        extendedBurnupDataArray.push({
          ...epicBurnups.dateData[epicBurnups.dateData.length - 1],
          date: currentDate.toISOString().split("T")[0] as TDateISODate,
          doneCount: null,
          doneEstimate: null,
          doneCountForecast: doneCountForecast,
          doneEstimateForecast: doneEstimateForecast,
          futureDoneKeys: [],
        });
        doneCountForecast += epicBurnups.doneCountIncrement;
        doneEstimateForecast += epicBurnups.doneEstimateIncrement;
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
  let previousIssues: DoneAndScopeCountWithForecast[] = [];
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
    let sumDone = reduceDSAField(
      issuesExistingToday,
      estimate ? "doneEstimate" : "doneCount"
    );
    let sumScope = reduceDSAField(
      issuesExistingToday,
      estimate ? "scopeEstimate" : "scopeCount"
    );
    let sumRequired = reduceDSAField(
      issuesExistingToday,
      estimate ? "doneEstimateRequired" : "doneCountRequired"
    );
    let sumForecast = reduceDSAField(
      issuesExistingToday,
      estimate ? "doneEstimateForecast" : "doneCountForecast"
    );
    if (sumForecast === 0) {
      sumForecast = null;
    }
    if (sumDone === 0) {
      sumDone = null;
    }
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (new Date(d) > tomorrow) {
      sumDone = null;
    }
    let allNewIssuesToday = new Set<string>();
    let allUncompletedScope = new Set<string>();
    issuesExistingToday.forEach((item) => {
      item.scopeKeys.forEach((key) => {
        allUncompletedScope.add(key);
      });
      item.doneKeys.forEach((key) => {
        allNewIssuesToday.add(key);
        allUncompletedScope.delete(key);
      });
    });
    previousIssues.forEach((item) => {
      item.doneKeys.forEach((key) => {
        allNewIssuesToday.delete(key);
      });
    });
    function getJiraString(key: string) {
      let jira = allJirasMap.get(key);
      if (jira) {
        return `<a href="${jira.url}">${key}</a> - ${jira.summary}`;
      }
      return key;
    }

    let clickData = "";
    clickData += "<h3>Issues done previously</h3>";
    previousIssues.forEach((item) => {
      item.doneKeys.forEach((key) => {
        clickData += `${getJiraString(key)}<br>`;
      });
    });
    clickData += "<h3>Issues done today</h3>";
    allNewIssuesToday.forEach((key) => {
      clickData += `${getJiraString(key)}<br>`;
    });
    clickData += "<h3>Uncompleted scope</h3>";
    allUncompletedScope.forEach((key) => {
      clickData += `${getJiraString(key)}<br>`;
    });
    previousIssues = issuesExistingToday;

    allDates.push({
      data: [new Date(d), sumDone, sumScope, sumRequired, sumForecast],
      clickData,
    });
  }
  return allDates;
}

export function getDataBetweenDates(
  doneAndScopeArray: DoneAndScopeCountWithForecast[],
  today: Date,
  tomorrow: Date
): DoneAndScopeCountWithForecast {
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
      doneCount: lastData.doneCount,
      doneEstimate: lastData.doneEstimate,
      doneKeys: lastData.doneKeys,
      scopeCount: lastData.scopeCount,
      scopeEstimate: lastData.scopeEstimate,
      scopeKeys: lastData.scopeKeys,
      doneCountForecast: lastData.doneCountForecast,
      doneEstimateForecast: lastData.doneEstimateForecast,
      futureDoneKeys: lastData.futureDoneKeys,
      doneCountRequired: lastData.doneCountRequired,
      doneEstimateRequired: lastData.doneEstimateRequired,
    };
  }
  return {
    date: today.toISOString().split("T")[0] as TDateISODate,
    doneCount: null,
    doneEstimate: null,
    doneKeys: [],
    scopeCount: null,
    scopeEstimate: null,
    scopeKeys: [],
    doneCountForecast: null,
    doneEstimateForecast: null,
    futureDoneKeys: [],
    doneCountRequired: null,
    doneEstimateRequired: null,
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
