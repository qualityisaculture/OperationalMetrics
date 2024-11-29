import React from "react";
import type { RadioChangeEvent, DatePickerProps, InputNumberProps } from "antd";
import { Radio, DatePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import { ThroughputSprintType } from "../server/graphManagers/ThroughputGraphManager";
import Select from "./Select";
import type { SelectProps } from "antd";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { getSize } from "./Utils";
import { DefaultOptionType } from "antd/es/select";

type GoogleDataTableType = {
  addColumn: (type: string, label: string) => void;
  addRow: (row: GoogleDataRowType) => void;
};

type GoogleDataRowType = {
  push: (value: any) => void;
};

type ClickDataType = { initiativeKey: string; issues: IssueInfo[] };
type ClickDataColumnType = ClickDataType[];

class ConcatableMap<K, V> extends Map<K, V[]> {
  concat(key: K, value: V) {
    let array = this.get(key);
    if (array) {
      this.set(key, array.concat(value));
    } else {
      this.set(key, [value]);
    }
  }
}
type SelectPropsType = {
  label: string;
  value: string;
};

interface Props {}
interface State {
  input: string;
  currentSprintStartDate: string;
  numberOfSprints: number;
  throughputData: ThroughputSprintType[];
  initiatitives: SelectProps["options"];
  initiativesSelected: string[];
  labels: SelectProps["options"];
  labelsSelected: string[];
  splitMode: "labels" | "initiatives";
  sizeMode: "count" | "time booked" | "estimate";
}

export default class Throughput extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    let tempQuery = new URLSearchParams(window.location.search).get(
      "throughputQuery"
    );
    this.state = {
      input: localStorage.getItem("throughputQuery") || tempQuery || "",
      currentSprintStartDate: dayjs().toString(),
      numberOfSprints: 4,
      throughputData: [],
      initiatitives: [],
      initiativesSelected: [],
      labels: [],
      labelsSelected: [],
      sizeMode: "count",
      splitMode: "initiatives",
    };
  }
  getValuesInSprint = (
    sprint: ThroughputSprintType,
    func: (IssueInfo) => { key: string; value: SelectPropsType }[]
  ): SelectPropsType[] => {
    let allFields = new Map<string, SelectPropsType>();
    sprint.issueList.forEach((issue) => {
      let fields = func(issue);
      fields.forEach((field) => {
        allFields.set(field.key, field.value);
      });
    });
    let arrayOfAllFields: SelectPropsType[] = Array.from(allFields.values());
    return arrayOfAllFields;
  };
  arrayOfAllFieldsAsSelectProps = (
    sprints: ThroughputSprintType[],
    func: (IssueInfo) => { key: string; value: SelectPropsType }[]
  ) => {
    let allFieldValues = new Map<string, { label: string; value: string }>();
    sprints.forEach((sprint) => {
      this.getValuesInSprint(sprint, func).forEach((fieldValues) => {
        allFieldValues.set(fieldValues.value, fieldValues);
      });
    });
    let arrayOfAllInitiatives: SelectProps["options"] = Array.from(
      allFieldValues.values()
    ).sort((a, b) => a.label.localeCompare(b.label));
    return arrayOfAllInitiatives;
  };
  getInitiativesAsSelectProps = (
    throughputData: ThroughputSprintType[]
  ): DefaultOptionType[] => {
    return this.arrayOfAllFieldsAsSelectProps(throughputData, (issue) => {
      if (!issue.initiativeKey) return [];
      return [
        {
          key: issue.initiativeKey,
          value: {
            label: issue.initiativeKey + ":" + issue.initiativeName,
            value: issue.initiativeKey,
          },
        },
      ];
    });
  };
  getLabelsAsSelectProps = (throughputData: ThroughputSprintType[]) => {
    return this.arrayOfAllFieldsAsSelectProps(throughputData, (issue) => {
      return issue.labels.map((label) => {
        return {
          key: label,
          value: {
            label: label,
            value: label,
          },
        };
      });
    });
  };
  onClick = () => {
    localStorage.setItem("throughputQuery", this.state.input);
    console.log("Button clicked");
    //Request to the server /api/metrics
    fetch(
      "/api/throughput?query=" +
        this.state.input +
        "&currentSprintStartDate=" +
        this.state.currentSprintStartDate +
        "&numberOfSprints=" +
        this.state.numberOfSprints
    )
      .then((response) => response.json())
      .then((data) => {
        let throughputData: ThroughputSprintType[] = JSON.parse(data.data);
        let arrayOfAllInitiatives =
          this.getInitiativesAsSelectProps(throughputData);
        let arrayOfAllLabels = this.getLabelsAsSelectProps(throughputData);
        this.setState({
          throughputData,
          initiatitives: arrayOfAllInitiatives,
          initiativesSelected: [],
          labels: arrayOfAllLabels,
          labelsSelected: [],
        });
      });
  };
  onSprintStartDateChange: DatePickerProps["onChange"] = (date, dateString) => {
    this.setState({ currentSprintStartDate: date.toString() });
  };
  onNumberOfSprintsChange = (value) => {
    this.setState({ numberOfSprints: value });
  };
  initiatitivesSelected = (selected: string[]) => {
    this.setState({ initiativesSelected: selected });
  };
  labelsSelected = (selected: string[]) => {
    this.setState({ labelsSelected: selected });
  };
  handleSizeChange = (e: RadioChangeEvent) => {
    this.setState({ sizeMode: e.target.value });
  };
  handleSplitModeChange = (e: RadioChangeEvent) => {
    this.setState({ splitMode: e.target.value });
  };
  render() {
    return (
      <div>
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            this.setState({ input: e.target.value });
          }}
        />
        Start Date of Current Sprint:
        <DatePicker
          onChange={this.onSprintStartDateChange}
          value={dayjs(this.state.currentSprintStartDate)}
        />
        Number of Sprints to show:
        <InputNumber
          value={this.state.numberOfSprints}
          onChange={this.onNumberOfSprintsChange}
        />
        <Radio.Group
          value={this.state.splitMode}
          onChange={this.handleSplitModeChange}
        >
          <Radio.Button value="initiatives">Initiatives</Radio.Button>
          <Radio.Button value="labels">Labels</Radio.Button>
        </Radio.Group>
        <span
          style={{
            display: this.state.splitMode === "initiatives" ? "" : "none",
          }}
        >
          <Select
            onChange={this.initiatitivesSelected.bind(this)}
            options={this.state.initiatitives}
          />
        </span>
        <span
          style={{
            display: this.state.splitMode === "labels" ? "" : "none",
          }}
        >
          <Select
            onChange={this.labelsSelected.bind(this)}
            options={this.state.labels}
          />
        </span>
        <Radio.Group
          value={this.state.sizeMode}
          onChange={this.handleSizeChange}
        >
          <Radio.Button value="count">Count</Radio.Button>
          <Radio.Button value="time booked">Time Booked</Radio.Button>
          <Radio.Button value="estimate">Estimate</Radio.Button>
        </Radio.Group>
        <button onClick={this.onClick}>Click me</button>
        <Chart
          throughputData={this.state.throughputData}
          initiativesSelected={this.state.initiativesSelected}
          sizeMode={this.state.sizeMode}
        />
      </div>
    );
  }
}

const google = globalThis.google;

interface ChartProps {
  throughputData: ThroughputSprintType[];
  initiativesSelected: string[];
  sizeMode: "count" | "time booked" | "estimate";
}
interface ChartState {}

class Chart extends React.Component<ChartProps, ChartState> {
  randomId: string;
  constructor(props) {
    super(props);
    this.randomId = Math.random().toString(36).substring(7);
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.throughputData) {
        return;
      }
      this.drawChart();
    }
  }

  addColumns(data: any, initiativesSelected: string[]) {
    data.addColumn("date", "Sprint Start Date");
    // Add columns for each initiative
    this.props.initiativesSelected.forEach((parent) => {
      data.addColumn("number", parent);
      data.addColumn({ role: "tooltip", p: { html: true } });
    });
    data.addColumn("number", "None");
    data.addColumn({ role: "tooltip", p: { html: true } });
  }

  getIssuesByInitiative(issues: IssueInfo[]): ConcatableMap<string, IssueInfo> {
    let issuesByInitiative = new ConcatableMap<string, IssueInfo>();

    issues.forEach((issue) => {
      if (issue.initiativeKey) {
        issuesByInitiative.concat(issue.initiativeKey, issue);
      } else {
        issuesByInitiative.concat("None", issue);
      }
    });
    return issuesByInitiative;
  }

  addDataToChart(data: any, clickData: ClickDataType[][]) {
    this.props.throughputData.forEach((sprint) => {
      let issuesByInitiative = this.getIssuesByInitiative(sprint.issueList);
      let columnClickData: ClickDataType[] = [];

      let row: GoogleDataRowType = [new Date(sprint.sprintStartingDate)];
      [...this.props.initiativesSelected, "None"].forEach((parent) => {
        let initiatives = issuesByInitiative.get(parent) || [];
        row.push(getSize(initiatives, this.props.sizeMode));
        row.push(initiatives.map((issue) => issue.key).join(", "));
        columnClickData.push({ initiativeKey: parent, issues: initiatives });
      });

      data.addRow(row);
      clickData.push(columnClickData);
    });
  }

  getHoursAndMinutes(time: number) {
    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  getDaysAndHours(time: number) {
    let totalHours = time / 3600;
    let days = Math.floor(totalHours / 8);
    let hours = Math.floor(totalHours % 8);
    return `${days}d ${hours}h`;
  }

  handleColumnClick = (chart, clickData: ClickDataType[][]) => {
    var selection = chart.getSelection();
    let jiraData = clickData[selection[0].row];
    let logHTML = "";
    jiraData.forEach((data) => {
      if (data.issues.length === 0) return;
      let allTimeSpent = data.issues.reduce(
        (sum, issue) => sum + (issue.timespent || 0),
        0
      );
      let allEstimate = data.issues.reduce(
        (sum, issue) => sum + (issue.timeoriginalestimate || 0),
        0
      );
      let allTimeDays = this.getDaysAndHours(allTimeSpent);
      let allEstimateDays = this.getDaysAndHours(allEstimate);
      logHTML += `<h3>${data.initiativeKey} e: ${allEstimateDays} a: ${allTimeDays}</h3>`;
      data.issues.forEach((issue) => {
        let timespentDays = this.getDaysAndHours(issue.timespent || 0);
        let estimateDays = this.getDaysAndHours(
          issue.timeoriginalestimate || 0
        );
        logHTML += `<p><a target="_blank" href="${issue.url}">${issue.key} ${issue.summary} - ${issue.type} - e: ${estimateDays} a: ${timespentDays}</a></p>`;
      });
    });
    let notesElement = document.getElementById("notes");
    if (notesElement) notesElement.innerHTML = logHTML;
  };

  drawChart() {
    var data = new google.visualization.DataTable();
    let clickData: ClickDataType[][] = [];
    this.addColumns(data, this.props.initiativesSelected);
    this.addDataToChart(data, clickData);

    var options = {
      title: "Throughput",
      // curveType: 'function',
      legend: { position: "bottom" },
      vAxis: {
        minValue: 0,
      },
      isStacked: true,
    };
    var chart = new google.visualization.ColumnChart(
      document.getElementById(this.randomId)
    );
    google.visualization.events.addListener(
      chart,
      "select",
      function () {
        this.handleColumnClick(chart, clickData);
      }.bind(this)
    );

    chart.draw(data, options);
  }

  render() {
    return (
      <div>
        <div id={this.randomId}></div>
      </div>
    );
  }
}
