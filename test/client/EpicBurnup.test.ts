import { getGoogleDataTableFromMultipleBurnupData } from "../../src/client/EpicBurnup";
import {
  BurnupDateData,
  BurnupEpicData,
} from "../../src/server/graphManagers/BurnupGraphManager";

describe("getGoogleDataTableFromMultipleBurnupData", () => {
  //set faketimer to 2021-01-01
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2021-01-15"));
  });
  function get1EpicPerDayData(
    numberOfDays: number,
    startDate: number = 0
  ): BurnupDateData[] {
    let data: BurnupDateData[] = [];
    for (let i = startDate; i < startDate + numberOfDays; i++) {
      let keys: string[] = [];
      for (let j = 0; j < i; j++) {
        keys.push("KEY-" + j);
      }
      data.push({
        date: new Date("2021-01-" + (i + 1)),
        doneCount: i,
        doneEstimate: i * 3600 * 8,
        doneKeys: keys,
        scopeCount: i,
        scopeEstimate: i * 3600 * 8,
        scopeKeys: keys,
        idealTrend: i,
        forecastTrend: i,
      });
    }
    return data;
  }
  it("should return just an empty flat line of today when passed no epics", () => {
    let allDates = getGoogleDataTableFromMultipleBurnupData([], true);
    expect(allDates.length).toEqual(1);
    expect(allDates[0]).toEqual([new Date("2021-01-15"), 0, 0, 0, 0]);
  });

  it("should return just return from the start of the epic if passed a single epic", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let epicBurnUpData: BurnupEpicData = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData],
      true
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[1]).toEqual([new Date("2021-01-02"), 1, 1, 1, 1]);
    expect(allDates[9]).toEqual([new Date("2021-01-10"), 9, 9, 9, 9]);
  });

  it("should return the final values after the epic data ends", () => {
    jest.setSystemTime(new Date("2021-01-15"));
    let epicBurnUpData: BurnupEpicData = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData],
      true
    );
    expect(allDates.length).toEqual(15);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[9]).toEqual([new Date("2021-01-10"), 9, 9, 9, 9]);
    expect(allDates[10]).toEqual([new Date("2021-01-11"), 9, 9, 9, 9]);
    expect(allDates[14]).toEqual([new Date("2021-01-15"), 9, 9, 9, 9]);
  });

  it("should add up two epics with the same data", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let epicBurnUpData: BurnupEpicData = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
    };
    let epicBurnUpData2: BurnupEpicData = {
      dateData: get1EpicPerDayData(5),
      summary: "Epic 2",
      key: "EPIC-2",
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData, epicBurnUpData2],
      true
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[1]).toEqual([new Date("2021-01-02"), 2, 2, 2, 2]);
    expect(allDates[4]).toEqual([new Date("2021-01-05"), 8, 8, 8, 8]);
    expect(allDates[5]).toEqual([new Date("2021-01-06"), 9, 9, 9, 9]);
    expect(allDates[9]).toEqual([new Date("2021-01-10"), 13, 13, 13, 13]);
  });

  it("should zero out before the epic starts", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let epicBurnUpData: BurnupEpicData = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
    };
    let epicBurnUpData2: BurnupEpicData = {
      dateData: get1EpicPerDayData(5,5),
      summary: "Epic 2",
      key: "EPIC-2",
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData, epicBurnUpData2],
      true
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[1]).toEqual([new Date("2021-01-02"), 1, 1, 1, 1]);
    expect(allDates[4]).toEqual([new Date("2021-01-05"), 4, 4, 4, 4]);
    expect(allDates[5]).toEqual([new Date("2021-01-06"), 10, 10, 10, 10]);
    expect(allDates[9]).toEqual([new Date("2021-01-10"), 18, 18, 18, 18]);
  });
});
