import React from "react";
import type { RadioChangeEvent, DatePickerProps, InputNumberProps } from "antd";
import { Radio, DatePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import { SprintIssueList } from "../server/graphManagers/GraphManagerTypes";
import Select from "./Select";
import type { SelectProps } from "antd";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { getSize } from "./Utils";
import { DefaultOptionType } from "antd/es/select";
import ColumnChart, { CategoryData, ColumnType } from "./ColumnChart";
import { WithWildcards } from "../Types";

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
  throughputData: SprintIssueList[];
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
    sprint: SprintIssueList,
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
    sprints: SprintIssueList[],
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
    throughputData: SprintIssueList[]
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
  getLabelsAsSelectProps = (throughputData: SprintIssueList[]) => {
    let allLabels = this.arrayOfAllFieldsAsSelectProps(
      throughputData,
      (issue) => {
        return issue.labels.map((label) => {
          return {
            key: label,
            value: {
              label: label,
              value: label,
            },
          };
        });
      }
    );
    allLabels.push({
      label: "None",
      value: "None",
    });
    return allLabels;
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
        let throughputData: SprintIssueList[] = JSON.parse(data.data);
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
  getClickData = (data: { initiativeKey: string; issues: any[] }) => {
    let logHTML = "";
    function getDaysAndHours(days: number) {
      let wholeDays = Math.floor(days);
      let hours = Math.round((days - wholeDays) * 8);
      return `${wholeDays}d ${hours}h`;
    }
    if (data.issues.length === 0) return;
    let allTimeSpent = data.issues.reduce(
      (sum, issue) => sum + (issue.timespent || 0),
      0
    );
    let allEstimate = data.issues.reduce(
      (sum, issue) => sum + (issue.timeoriginalestimate || 0),
      0
    );
    let allTimeDays = getDaysAndHours(allTimeSpent);
    let allEstimateDays = getDaysAndHours(allEstimate);
    logHTML += `<h3>${data.initiativeKey} e: ${allEstimateDays} a: ${allTimeDays}</h3>`;
    data.issues.forEach((issue) => {
      let timespentDays = getDaysAndHours(issue.timespent || 0);
      let estimateDays = getDaysAndHours(issue.timeoriginalestimate || 0);
      logHTML += `<p><a target="_blank" href="${issue.url}">${issue.key} ${issue.summary} - ${issue.type} - e: ${estimateDays} a: ${timespentDays}</a></p>`;
    });
    return logHTML;
  };
  getThroughputByInitiative = (
    throughputData: SprintIssueList[]
  ): { data: CategoryData; columns: ColumnType[] } => {
    let columns: ColumnType[] = [
      { type: "date", label: "Sprint Start Date", identifier: "date" },
    ];
    this.state.initiativesSelected.forEach((initiative) => {
      columns.push({
        type: "number",
        label: initiative,
        identifier: initiative,
      });
    });
    columns.push({ type: "number", label: "Other", identifier: "Other" });
    // columns.push({ type: "number", label: "None", identifier: "None" });

    let data: WithWildcards<{}>[] = [];

    function getIssuesByInitiative(
      issues: IssueInfo[]
    ): ConcatableMap<string, IssueInfo> {
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

    this.state.throughputData.forEach((sprint) => {
      let issuesByInitiative = getIssuesByInitiative(sprint.issueList);
      let row: WithWildcards<{}> = {
        date: new Date(sprint.sprintStartingDate),
      };

      let clickData = "";
      this.state.initiativesSelected.forEach((parent) => {
        let issues = issuesByInitiative.get(parent) || [];
        row[parent] = getSize(issues, this.state.sizeMode);
        clickData += this.getClickData({ initiativeKey: parent, issues });
      });
      let otherInitiatives = Array.from(issuesByInitiative.keys()).filter(
        (initiative) => !this.state.initiativesSelected.includes(initiative)
      );
      let x: IssueInfo[] = [];
      let otherIssues = otherInitiatives.reduce((acc, initiative) => {
        return acc.concat(issuesByInitiative.get(initiative) || []);
      }, x);
      clickData += this.getClickData({
        initiativeKey: "Other",
        issues: otherIssues,
      });
      row["Other"] = getSize(otherIssues, this.state.sizeMode);
      row["clickData"] = clickData;
      data.push(row);
    });
    return { data, columns };
  };

  getThroughputByLabel(throughputData: SprintIssueList[]) {
    let columns: ColumnType[] = [
      { type: "date", label: "Sprint Start Date", identifier: "date" },
    ];
    this.state.labelsSelected.forEach((label) => {
      columns.push({
        type: "number",
        label: label,
        identifier: label,
      });
    });
    columns.push({ type: "number", label: "Other", identifier: "Other" });

    let data: WithWildcards<{}>[] = [];

    function getIssuesByLabel(issues: IssueInfo[]) {
      let issuesByLabel = new ConcatableMap<string, IssueInfo>();

      issues.forEach((issue) => {
        issue.labels.forEach((label) => {
          issuesByLabel.concat(label, issue);
        });
        if (issue.labels.length === 0) {
          issuesByLabel.concat("None", issue);
        }
      });
      return issuesByLabel;
    }

    this.state.throughputData.forEach((sprint) => {
      let issuesByLabel = getIssuesByLabel(sprint.issueList);
      let row: WithWildcards<{}> = {
        date: new Date(sprint.sprintStartingDate),
      };

      let clickData = "";
      this.state.labelsSelected.forEach((parent) => {
        let issues = issuesByLabel.get(parent) || [];
        row[parent] = getSize(issues, this.state.sizeMode);
        clickData += this.getClickData({ initiativeKey: parent, issues });
      });
      let otherLabels = Array.from(issuesByLabel.keys()).filter(
        (label) => !this.state.labelsSelected.includes(label)
      );
      let x: IssueInfo[] = [];
      let otherIssues = otherLabels.reduce((acc, label) => {
        return acc.concat(issuesByLabel.get(label) || []);
      }, x);
      clickData += this.getClickData({
        initiativeKey: "Other",
        issues: otherIssues,
      });
      row["Other"] = getSize(otherIssues, this.state.sizeMode);
      row["clickData"] = clickData;
      data.push(row);
    });
    return { data, columns };
  }

  render() {
    let { data, columns } =
      this.state.splitMode === "initiatives"
        ? this.getThroughputByInitiative(this.state.throughputData)
        : this.getThroughputByLabel(this.state.throughputData);

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
        <ColumnChart
          data={data}
          columns={columns}
          title="Throughput"
          extraOptions={{ isStacked: true }}
        />
      </div>
    );
  }
}
