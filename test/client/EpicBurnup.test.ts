import {
  extendEpicBurnup,
  getGoogleDataTableFromMultipleBurnupData,
} from "../../src/client/EpicBurnup";
import {
  EpicBurnupData,
  EpicBurnups,
} from "../../src/server/graphManagers/BurnupGraphManager";

function get1EpicPerDayData(
  numberOfDays: number,
  startDate: number = 0
): EpicBurnupData[] {
  let data: EpicBurnupData[] = [];
  let date = new Date("2021-01-01");
  date.setDate(date.getDate() + startDate);
  for (let i = startDate; i < startDate + numberOfDays; i++) {
    let keys: string[] = [];
    for (let j = 0; j < i; j++) {
      keys.push("KEY-" + j);
    }
    data.push({
      //@ts-ignore
      date: date.toISOString().split("T")[0],
      doneCount: i,
      doneEstimate: i * 3600 * 8,
      doneKeys: keys,
      scopeCount: i,
      scopeEstimate: i * 3600 * 8,
      scopeKeys: keys,
    });
    date.setDate(date.getDate() + 1);
  }
  return data;
}

describe("getGoogleDataTableFromMultipleBurnupData", () => {
  //set faketimer to 2021-01-01
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2021-01-15"));
  });

  it("should return just an empty flat line of today when passed no epics", () => {
    let allDates = getGoogleDataTableFromMultipleBurnupData([], true);
    expect(allDates.length).toEqual(1);
    expect(allDates[0]).toEqual([new Date("2021-01-15"), 0, 0, 0, 0]);
  });

  it("should return just return from the start of the epic if passed a single epic", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let epicBurnUpData: EpicBurnups = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
      startDate: new Date("2021-01-01"),
      endDate: new Date("2021-01-10"),
      doneCountIncrement: 1,
      doneEstimateIncrement: 0,
      scopeCountIncrement: 1,
      scopeEstimateIncrement: 0,
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData],
      true
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[1]).toEqual([
      new Date("2021-01-02"),
      1,
      1,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[9]).toEqual([
      new Date("2021-01-10"),
      9,
      9,
      expect.any(Number),
      expect.any(Number),
    ]);
  });

  it("should return the final values after the epic data ends", () => {
    jest.setSystemTime(new Date("2021-01-15"));
    let epicBurnUpData: EpicBurnups = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
      startDate: new Date("2021-01-01"),
      endDate: new Date("2021-01-10"),
      doneCountIncrement: 1,
      doneEstimateIncrement: 0,
      scopeCountIncrement: 1,
      scopeEstimateIncrement: 0,
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData],
      true
    );
    expect(allDates.length).toEqual(15);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[9]).toEqual([
      new Date("2021-01-10"),
      9,
      9,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[10]).toEqual([
      new Date("2021-01-11"),
      9,
      9,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[14]).toEqual([
      new Date("2021-01-15"),
      9,
      9,
      expect.any(Number),
      expect.any(Number),
    ]);
  });

  it("should add up two epics with the same data", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let epicBurnUpData: EpicBurnups = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
      startDate: new Date("2021-01-01"),
      endDate: new Date("2021-01-10"),
      doneCountIncrement: 1,
      doneEstimateIncrement: 0,
      scopeCountIncrement: 1,
      scopeEstimateIncrement: 0,
    };
    let epicBurnUpData2: EpicBurnups = {
      dateData: get1EpicPerDayData(5),
      summary: "Epic 2",
      key: "EPIC-2",
      startDate: new Date("2021-01-01"),
      endDate: new Date("2021-01-10"),
      doneCountIncrement: 1,
      doneEstimateIncrement: 0,
      scopeCountIncrement: 1,
      scopeEstimateIncrement: 0,
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData, epicBurnUpData2],
      true
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[1]).toEqual([
      new Date("2021-01-02"),
      2,
      2,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[4]).toEqual([
      new Date("2021-01-05"),
      8,
      8,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[5]).toEqual([
      new Date("2021-01-06"),
      9,
      9,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[9]).toEqual([
      new Date("2021-01-10"),
      13,
      13,
      expect.any(Number),
      expect.any(Number),
    ]);
  });

  it("should add up two epics", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let epicBurnUpData: EpicBurnups = {
      dateData: get1EpicPerDayData(10),
      summary: "Epic 1",
      key: "EPIC-1",
      startDate: new Date("2021-01-01"),
      endDate: new Date("2021-01-10"),
      doneCountIncrement: 1,
      doneEstimateIncrement: 0,
      scopeCountIncrement: 1,
      scopeEstimateIncrement: 0,
    };
    let epicBurnUpData2: EpicBurnups = {
      dateData: get1EpicPerDayData(5, 5),
      summary: "Epic 2",
      key: "EPIC-2",
      startDate: new Date("2021-01-01"),
      endDate: new Date("2021-01-10"),
      doneCountIncrement: 1,
      doneEstimateIncrement: 0,
      scopeCountIncrement: 1,
      scopeEstimateIncrement: 0,
    };
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [epicBurnUpData, epicBurnUpData2],
      true
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0]).toEqual([new Date("2021-01-01"), 0, 0, 0, 0]);
    expect(allDates[1]).toEqual([
      new Date("2021-01-02"),
      1,
      1,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[4]).toEqual([
      new Date("2021-01-05"),
      4,
      4,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[5]).toEqual([
      new Date("2021-01-06"),
      10,
      10,
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(allDates[9]).toEqual([
      new Date("2021-01-10"),
      18,
      18,
      expect.any(Number),
      expect.any(Number),
    ]);
  });
});

describe("extendEpicBurnup", () => {
  let epicBurnUpData: EpicBurnupData[] = get1EpicPerDayData(10);
  let defaultEpicBurnups: EpicBurnups = {
    dateData: epicBurnUpData,
    summary: "Epic 1",
    key: "EPIC-1",
    startDate: new Date("2021-01-01"),
    endDate: new Date("2021-01-10"),
    doneCountIncrement: 1,
    doneEstimateIncrement: 0,
    scopeCountIncrement: 1,
    scopeEstimateIncrement: 0,
  };
  let defaultEpicBurnupsFrom6th: EpicBurnups = {
    dateData: get1EpicPerDayData(5, 5),
    summary: "Epic 1",
    key: "EPIC-1",
    startDate: new Date("2021-01-06"),
    endDate: new Date("2021-01-10"),
    doneCountIncrement: 1,
    doneEstimateIncrement: 0,
    scopeCountIncrement: 1,
    scopeEstimateIncrement: 0,
  };
  let defaultEarliestDate = new Date("2021-01-01");
  let defaultLastDate = new Date("2021-01-10");
  it("should throw an error if the earliest date is after start date", () => {
    let earliestDate = new Date("2021-01-02");
    let lastDate = new Date("2021-01-10");
    expect(() =>
      extendEpicBurnup(defaultEpicBurnups, earliestDate, lastDate)
    ).toThrowError();
  });
  it("should throw an error if the last date is before end date", () => {
    let earliestDate = new Date("2021-01-01");
    let lastDate = new Date("2021-01-09");
    expect(() =>
      extendEpicBurnup(defaultEpicBurnups, earliestDate, lastDate)
    ).toThrowError();
  });
  it("should return the same data with the future fields set to null if earliest and last date are within data range", () => {
    let extendedData = extendEpicBurnup(
      defaultEpicBurnups,
      defaultEarliestDate,
      defaultLastDate
    );
    expect(extendedData).toEqual(
      epicBurnUpData.map((item) => {
        return {
          ...item,
          futureDoneCount: null,
          futureDoneEstimate: null,
          futureDoneKeys: [],
          futureScopeCount: null,
          futureScopeEstimate: null,
          futureScopeKeys: [],
        };
      })
    );
  });
  it("should prepend with nulls if earliest date is before start date", () => {
    let earliestDate = new Date("2020-12-31");
    let lastDate = new Date("2021-01-10");
    let extendedData = extendEpicBurnup(
      defaultEpicBurnups,
      earliestDate,
      lastDate
    );
    expect(extendedData.length).toEqual(11);
    expect(extendedData[0]).toEqual({
      date: "2020-12-31",
      doneCount: null,
      doneEstimate: null,
      doneKeys: [],
      scopeCount: null,
      scopeEstimate: null,
      scopeKeys: [],
      futureDoneCount: null,
      futureDoneEstimate: null,
      futureDoneKeys: [],
      futureScopeCount: null,
      futureScopeEstimate: null,
      futureScopeKeys: [],
    });
  });

  // it("should append with duplicates of final data if last date is after end date", () => {
  //   let earliestDate = new Date("2021-01-01");
  //   let lastDate = new Date("2021-01-11");
  //   let extendedData = extendEpicBurnup(
  //     defaultEpicBurnups,
  //     earliestDate,
  //     lastDate
  //   );
  //   expect(extendedData.length).toEqual(11);
  //   expect(extendedData[10]).toEqual({
  //     ...extendedData[9],
  //     date: "2021-01-11",
  //   });
  // });

  it("should increase the future done count by increment from the end date", () => {
    let earliestDate = new Date("2021-01-01");
    let lastDate = new Date("2021-01-20");
    let extendedData = extendEpicBurnup(
      defaultEpicBurnupsFrom6th,
      earliestDate,
      lastDate
    );
    console.log(extendedData);
    expect(extendedData.length).toEqual(20);
    expect(extendedData[0].futureDoneCount).toEqual(null);
    expect(extendedData[4].futureDoneCount).toEqual(null);
    expect(extendedData[5].futureDoneCount).toEqual(null);
    expect(extendedData[6].futureDoneCount).toEqual(null);
    expect(extendedData[9].futureDoneCount).toEqual(null);
    expect(extendedData[10].futureDoneCount).toEqual(5);
  });
});
