import React from "react";
import {
  EpicBurnup,
  DoneAndScopeCount,
  DoneAndScopeCountWithForecast,
} from "../server/graphManagers/BurnupGraphManager";
import Select from "./Select";
import type { SelectProps, RadioChangeEvent } from "antd";
import { DatePicker, Radio } from "antd";
import { getSize } from "./Utils";
import { TDateISODate } from "../Types";
import dayjs, { Dayjs } from "dayjs";

interface Props {}
interface State {
  input: string;
  epicSelectList: SelectProps["options"];
  selectedEpics: string[];
  selectedEpicsData: GoogleDataTableType[];
  allEpicsData: EpicBurnup[];
  sizeMode: "count" | "estimate";
  startDate: Dayjs;
  endDate: Dayjs;
}

type GoogleDataTableType = {
  data: [Date, number | null, number | null, number | null, number | null];
  clickData?: string;
};

const google = globalThis.google;

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

export function getSelectedEpics(
  allEpicsData: EpicBurnup[],
  selectedEpics?: number[]
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
    return acc > val.endDate ? acc : val.endDate;
  }, new Date());
  let today = new Date();
  return lastDateInJiras > today ? lastDateInJiras : today;
}

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

export function reduceDSAField(
  array: DoneAndScopeCount[],
  field: string
): number | null {
  return array.reduce((acc, val) => {
    return acc + val[field];
  }, 0);
}

export function getGoogleDataTableFromMultipleBurnupData(
  allEpicsData: EpicBurnup[],
  estimate: boolean,
  earliestDate: Date,
  lastDate: Date,
  selectedEpics?: number[]
): GoogleDataTableType[] {
  let filteredEpics = getSelectedEpics(allEpicsData, selectedEpics);
  // let earliestDate = new Date(getEarliestDate(filteredEpics));
  // let lastDate = new Date(getLastDate(filteredEpics));
  let extendedBurnupDataArray = filteredEpics.map((item) => {
    return extendEpicBurnup(item, earliestDate, lastDate);
  });
  // let googleBurnupDataArray = filteredEpics.map((item) => {
  //   return getGoogleDataTableFromBurnupDateData(item.dateData, estimate);
  // });
  // let googleBurnupDataArray = extendedBurnupDataArray.map((item) => {
  //   return getGoogleDataTableFromBurnupDateData(item, estimate);
  // });
  let previousIssues: DoneAndScopeCountWithForecast[] = [];
  let allDates: GoogleDataTableType[] = [];
  for (
    let d = new Date(earliestDate);
    d <= new Date(lastDate);
    d.setDate(d.getDate() + 1)
  ) {
    let dayAfterDate = new Date(d);
    dayAfterDate.setDate(dayAfterDate.getDate() + 1);
    let dataBetweenDates = extendedBurnupDataArray.map(
      (doneAndScopeCountArray) => {
        return getDataBetweenDates(doneAndScopeCountArray, d, dayAfterDate);
      }
    );
    let sumDone = reduceDSAField(
      dataBetweenDates,
      estimate ? "doneEstimate" : "doneCount"
    );
    let sumScope = reduceDSAField(
      dataBetweenDates,
      estimate ? "scopeEstimate" : "scopeCount"
    );
    let sumRequired = reduceDSAField(
      dataBetweenDates,
      estimate ? "doneEstimateRequired" : "doneCountRequired"
    );
    let sumForecast = reduceDSAField(
      dataBetweenDates,
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
    dataBetweenDates.forEach((item) => {
      item.doneKeys.forEach((key) => {
        allNewIssuesToday.add(key);
      });
    });
    previousIssues.forEach((item) => {
      item.doneKeys.forEach((key) => {
        allNewIssuesToday.delete(key);
      });
    });
    let clickData = "<h3>Issues done today</h3>";
    allNewIssuesToday.forEach((key) => {
      clickData += `${key}<br>`;
    });
    clickData += "<h3>Issues done previously</h3>";
    previousIssues.forEach((item) => {
      item.doneKeys.forEach((key) => {
        clickData += `${key}<br>`;
      });
    });
    previousIssues = dataBetweenDates;

    allDates.push({
      data: [new Date(d), sumDone, sumScope, sumRequired, sumForecast],
      clickData,
    });
  }
  return allDates;
}

export default class EpicBurnupClass extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: localStorage.getItem("epicIssueKey") || "",
      epicSelectList: [],
      selectedEpics: [],
      selectedEpicsData: [],
      allEpicsData: [],
      sizeMode: "count",
      startDate: dayjs(),
      endDate: dayjs(),
    };
  }
  onClick() {
    console.log("Button clicked");
    localStorage.setItem("epicIssueKey", this.state.input);
    //Request to the server /api/metrics
    fetch("/api/epicBurnup?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let burnupDataArrays: EpicBurnup[] = JSON.parse(data.data);
        this.setState({ allEpicsData: burnupDataArrays });
        this.setState({
          epicSelectList: burnupDataArrays.map((item, i) => {
            return { label: item.key + " - " + item.summary, value: i };
          }),
        });
        let firstDate = getEarliestDate(burnupDataArrays);
        let lastDate = getLastDate(burnupDataArrays);

        let selectedEpicsData = getGoogleDataTableFromMultipleBurnupData(
          burnupDataArrays,
          false,
          firstDate,
          lastDate
        );
        this.setState({
          selectedEpicsData,
          startDate: dayjs(firstDate),
          endDate: dayjs(lastDate),
        });

        // this.drawChart(burnupDataArrays[0].data);
      });
  }
  // Callback that creates and populates a data table,
  // instantiates the pie chart, passes in the data and
  // draws it.

  onSelectedEpicsChanged = (selected: string[]) => {
    let filteredEpics = getSelectedEpics(
      this.state.allEpicsData,
      selected.map((item) => parseInt(item))
    );
    let firstDate = getEarliestDate(filteredEpics);
    let lastDate = getLastDate(filteredEpics);
    let x = getGoogleDataTableFromMultipleBurnupData(
      this.state.allEpicsData,
      this.state.sizeMode === "estimate",
      firstDate,
      lastDate,
      selected.map((item) => parseInt(item))
    );
    this.setState({
      selectedEpics: selected,
      selectedEpicsData: x,
      startDate: dayjs(firstDate),
      endDate: dayjs(lastDate),
    });
  };
  handleSizeChange = (e: RadioChangeEvent) => {
    this.setState({ sizeMode: e.target.value });
    let startDate = this.state.startDate.toDate();
    let endDate = this.state.endDate.toDate();
    let selectedEpicsData = getGoogleDataTableFromMultipleBurnupData(
      this.state.allEpicsData,
      e.target.value === "estimate",
      startDate,
      endDate,
      this.state.selectedEpics.map((item) => parseInt(item))
    );
    this.setState({
      selectedEpicsData,
    });
  };
  render() {
    let data = getGoogleDataTableFromMultipleBurnupData(
      this.state.allEpicsData,
      this.state.sizeMode === "estimate",
      this.state.startDate.toDate(),
      this.state.endDate.toDate(),
      this.state.selectedEpics.map((item) => parseInt(item))
    );
    return (
      <div>
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            this.setState({ input: e.target.value });
          }}
        />
        <button onClick={this.onClick}>Click me</button>
        <Radio.Group
          value={this.state.sizeMode}
          onChange={this.handleSizeChange}
        >
          <Radio.Button value="count">Count</Radio.Button>
          <Radio.Button value="estimate">Estimate</Radio.Button>
        </Radio.Group>
        <br />
        <Select
          options={this.state.epicSelectList}
          onChange={this.onSelectedEpicsChanged}
        />
        <br />
        {/* <DatePicker
        DON'T TURN THIS ON, BECAUSE MOVING THE FIRST DATE MAKES THE BURNUP REQUIRED INCORRECT
          onChange={(date, dateString) => {
            this.setState({ startDate: date });
          }}
          value={this.state.startDate}
        /> */}
        <DatePicker
          onChange={(date, dateString) => {
            this.setState({ endDate: date });
          }}
          value={this.state.endDate}
        />
        <LineChart burnupDataArray={data} />
      </div>
    );
  }
}

interface ChartProps {
  burnupDataArray: GoogleDataTableType[];
  // initiativesSelected: string[];
  // sizeMode: "count" | "time booked";
}
interface ChartState {}

class LineChart extends React.Component<ChartProps, ChartState> {
  randomId: string;
  constructor(props) {
    super(props);
    this.randomId = Math.random().toString(36).substring(7);
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.burnupDataArray) {
        return;
      }
      this.drawChart();
    }
  }

  handleColumnClick = (chart) => {
    var selection = chart.getSelection();
    let clickData: string = this.props.burnupDataArray[selection[0].row]
      .clickData as string;
    let notesElement = document.getElementById("notes");
    if (notesElement) notesElement.innerHTML = clickData;
  };

  drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn("date", "Date");
    data.addColumn("number", "Done");
    data.addColumn("number", "Scope");
    data.addColumn("number", "Ideal Trend");
    data.addColumn("number", "Forecast Trend");
    data.addRows(this.props.burnupDataArray.map((item) => item.data));

    var options = {
      title: "Issue Burnup",
      legend: { position: "bottom" },
      series: {
        0: { color: "blue" }, //done
        1: { color: "green" }, //scope
        2: { color: "red", lineDashStyle: [4, 4] }, //ideal
        3: { color: "orange", lineDashStyle: [4, 4] }, //forecast
      },
    };

    var chart = new google.visualization.LineChart(
      document.getElementById(this.randomId)
    );
    google.visualization.events.addListener(
      chart,
      "select",
      function () {
        this.handleColumnClick(chart);
      }.bind(this)
    );

    chart.draw(data, options);
  }

  render(): React.ReactNode {
    return (
      <div>
        <div id={this.randomId}></div>
      </div>
    );
  }
}
