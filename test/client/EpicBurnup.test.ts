import {
  extendEpicBurnup,
  getGoogleDataTableFromMultipleBurnupData,
} from "../../src/client/EpicBurnup";
import {
  DoneAndScopeCount,
  EpicBurnup,
} from "../../src/server/graphManagers/BurnupGraphManager";

function get1EpicPerDayData(
  numberOfDays: number,
  startDate: number = 0
): DoneAndScopeCount[] {
  let data: DoneAndScopeCount[] = [];
  let date = new Date("2021-01-01");
  date.setDate(date.getDate() + startDate);
  for (let i = startDate; i < startDate + numberOfDays; i++) {
    let keys: string[] = [];
    for (let j = 0; j < i; j++) {
      keys.push("KEY-" + j);
    }
    //@ts-ignore
    let isoDate: TDateISODate = date.toISOString().split("T")[0];
    data.push({
      date: isoDate,
      doneCount: i,
      doneEstimate: i * 3600 * 8,
      doneKeys: keys,
      scopeCount: i,
      scopeEstimate: i * 3600 * 8,
      scopeKeys: keys,
      doneCountRequired: i,
      doneEstimateRequired: i * 3600 * 8,
    });
    date.setDate(date.getDate() + 1);
  }
  return data;
}

let defaultEpicBurnups: EpicBurnup = {
  dateData: get1EpicPerDayData(10),
  summary: "Epic 1",
  key: "EPIC-1",
  startDate: new Date("2021-01-01"),
  endDate: new Date("2021-01-10"),
  doneCountIncrement: 1,
  doneEstimateIncrement: 0,
  doneCountLimit: 10,
  doneEstimateLimit: 80,
  doneCountRequiredLimit: 10,
  doneEstimateRequiredLimit: 80,
};

let first5DaysEpicBurnups: EpicBurnup = {
  dateData: get1EpicPerDayData(5),
  summary: "Epic 2",
  key: "EPIC-2",
  startDate: new Date("2021-01-01"),
  endDate: new Date("2021-01-10"),
  doneCountIncrement: 1,
  doneEstimateIncrement: 0,
  doneCountLimit: 10,
  doneEstimateLimit: 80,
  doneCountRequiredLimit: 10,
  doneEstimateRequiredLimit: 80,
};
let second5DaysEpicBurnups: EpicBurnup = {
  dateData: get1EpicPerDayData(5, 5),
  summary: "Epic 2",
  key: "EPIC-2",
  startDate: new Date("2021-01-06"),
  endDate: new Date("2021-01-10"),
  doneCountIncrement: 1,
  doneEstimateIncrement: 0,
  doneCountLimit: 10,
  doneEstimateLimit: 80,
  doneCountRequiredLimit: 10,
  doneEstimateRequiredLimit: 80,
};

describe("getGoogleDataTableFromMultipleBurnupData", () => {
  //set faketimer to 2021-01-01
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2021-01-15"));
  });

  it("should return just an empty flat line of today when passed no epics", () => {
    let startDate = new Date("2021-01-15");
    let endDate = new Date("2021-01-15");
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [],
      true,
      startDate,
      endDate
    );
    expect(allDates.length).toEqual(1);
    expect(allDates[0].data).toEqual([
      new Date("2021-01-15"),
      null,
      0,
      0,
      null,
    ]);
  });

  it("should return just return from the start of the epic if passed a single epic", () => {
    jest.setSystemTime(new Date("2021-01-10"));

    let startDate = new Date("2021-01-01");
    let endDate = new Date("2021-01-10");
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [defaultEpicBurnups],
      true,
      startDate,
      endDate
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0].data).toEqual([
      new Date("2021-01-01"),
      null,
      0,
      0,
      null,
    ]);
    expect(allDates[1].data).toEqual([
      new Date("2021-01-02"),
      28800,
      28800,
      expect.any(Number),
      null,
    ]);
    expect(allDates[9].data).toEqual([
      new Date("2021-01-10"),
      259200,
      259200,
      expect.any(Number),
      null,
    ]);
  });

  it("should return the final values after the epic data ends", () => {
    let startDate = new Date("2021-01-01");
    let endDate = new Date("2021-01-15");
    jest.setSystemTime(new Date("2021-01-15"));
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [defaultEpicBurnups],
      true,
      startDate,
      endDate
    );
    expect(allDates.length).toEqual(15);
    expect(allDates[0].data).toEqual([
      new Date("2021-01-01"),
      null,
      0,
      0,
      null,
    ]);
    expect(allDates[9].data).toEqual([
      new Date("2021-01-10"),
      259200,
      259200,
      expect.any(Number),
      null,
    ]);
    expect(allDates[10].data).toEqual([
      new Date("2021-01-11"),
      259200,
      259200,
      expect.any(Number),
      null,
    ]);
    expect(allDates[14].data).toEqual([
      new Date("2021-01-15"),
      259200,
      259200,
      expect.any(Number),
      null,
    ]);
  });

  it("should add up two epics with the same data", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let startDate = new Date("2021-01-01");
    let endDate = new Date("2021-01-10");
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [defaultEpicBurnups, first5DaysEpicBurnups],
      true,
      startDate,
      endDate
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0].data).toEqual([
      new Date("2021-01-01"),
      null,
      0,
      0,
      null,
    ]);
    expect(allDates[1].data).toEqual([
      new Date("2021-01-02"),
      57600,
      57600,
      expect.any(Number),
      null,
    ]);
    expect(allDates[4].data).toEqual([
      new Date("2021-01-05"),
      230400,
      230400,
      expect.any(Number),
      null,
    ]);
    expect(allDates[5].data).toEqual([
      new Date("2021-01-06"),
      259200,
      259200,
      expect.any(Number),
      null,
    ]);
    expect(allDates[9].data).toEqual([
      new Date("2021-01-10"),
      374400,
      374400,
      expect.any(Number),
      null,
    ]);
  });

  it("should add up two epics", () => {
    jest.setSystemTime(new Date("2021-01-10"));
    let startDate = new Date("2021-01-01");
    let endDate = new Date("2021-01-10");
    let allDates = getGoogleDataTableFromMultipleBurnupData(
      [defaultEpicBurnups, second5DaysEpicBurnups],
      true,
      startDate,
      endDate
    );
    expect(allDates.length).toEqual(10);
    expect(allDates[0].data).toEqual([
      new Date("2021-01-01"),
      null,
      0,
      0,
      null,
    ]);
    expect(allDates[1].data).toEqual([
      new Date("2021-01-02"),
      28800,
      28800,
      expect.any(Number),
      null,
    ]);
    expect(allDates[4].data).toEqual([
      new Date("2021-01-05"),
      115200,
      115200,
      expect.any(Number),
      null,
    ]);
    expect(allDates[5].data).toEqual([
      new Date("2021-01-06"),
      288000,
      288000,
      expect.any(Number),
      null,
    ]);
    expect(allDates[9].data).toEqual([
      new Date("2021-01-10"),
      518400,
      518400,
      expect.any(Number),
      null,
    ]);
  });
});

describe("extendEpicBurnup", () => {
  let epicBurnUpData: DoneAndScopeCount[] = get1EpicPerDayData(10);
  // let defaultEpicBurnups: EpicBurnups = {
  //   dateData: epicBurnUpData,
  //   summary: "Epic 1",
  //   key: "EPIC-1",
  //   startDate: new Date("2021-01-01"),
  //   endDate: new Date("2021-01-10"),
  //   doneCountIncrement: 1,
  //   doneEstimateIncrement: 0,
  //   scopeCountIncrement: 1,
  //   scopeEstimateIncrement: 0,
  // };
  // let defaultEpicBurnupsFrom6th: EpicBurnups = {
  //   dateData: get1EpicPerDayData(5, 5),
  //   summary: "Epic 1",
  //   key: "EPIC-1",
  //   startDate: new Date("2021-01-06"),
  //   endDate: new Date("2021-01-10"),
  //   doneCountIncrement: 1,
  //   doneEstimateIncrement: 0,
  //   scopeCountIncrement: 1,
  //   scopeEstimateIncrement: 0,
  // };
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
      epicBurnUpData.map((item, index) => {
        return {
          ...item,
          doneCountForecast: index,
          doneCountRequired: index,
          doneEstimateForecast: 0,
          doneEstimateRequired: index * 28800,
          futureDoneKeys: [],
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
      doneCountForecast: null,
      doneCountRequired: null,
      doneEstimateForecast: null,
      doneEstimateRequired: null,
      futureDoneKeys: [],
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
      second5DaysEpicBurnups,
      earliestDate,
      lastDate
    );
    console.log(extendedData.length);
    console.log(extendedData[0]);
    expect(extendedData.length).toEqual(20);
    expect(extendedData[0].doneCountForecast).toEqual(null);
    expect(extendedData[9].doneCountForecast).toEqual(4);
    expect(extendedData[10].doneCountForecast).toEqual(5);
    expect(extendedData[19].doneCountForecast).toEqual(14);
  });
});
