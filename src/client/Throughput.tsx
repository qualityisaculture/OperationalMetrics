import React from "react";
import type { RadioChangeEvent, DatePickerProps, InputNumberProps } from "antd";
import {
  Radio,
  DatePicker,
  InputNumber,
  Spin,
  Button,
  AutoComplete,
} from "antd";
import dayjs from "dayjs";
import { SprintIssueList } from "../server/graphManagers/GraphManagerTypes";
import Select from "./Select";
import type { SelectProps } from "antd";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { getSize, createThroughputCSV } from "./Utils";
import { DefaultOptionType } from "antd/es/select";
import ColumnChart, { CategoryData, ColumnType } from "./ColumnChart";
import { WithWildcards } from "../Types";
import SankeyDiagram, { SankeyLink } from "./SankeyDiagram";
import InvestmentDiagram from "./InvestmentDiagram";

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

type IssueGroup = {
  name: string;
  issues: IssueInfo[];
};

interface Props {}
interface State {
  isLoading: boolean;
  statusMessage: string;
  currentStep?: string;
  progress?: {
    current: number;
    total: number;
    totalIssues: number;
  };
  input: string;
  queryHistory: string[];
  currentSprintStartDate: string;
  numberOfSprints: number;
  throughputData: SprintIssueList[];
  initiatitives: SelectProps["options"];
  initiativesSelected: string[];
  labels: SelectProps["options"];
  labelsSelected: string[];
  types: SelectProps["options"];
  typesSelected: string[];
  accounts: SelectProps["options"];
  accountsSelected: string[];
  splitMode: "labels" | "initiatives" | "types" | "accounts" | "sankey";
  sizeMode: "count" | "time booked" | "estimate";
  sankeyGroups: IssueGroup[];
}

export default class Throughput extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    let tempQuery = new URLSearchParams(window.location.search).get(
      "throughputQuery"
    );

    // Load saved query history from localStorage
    const savedQueryHistory = localStorage.getItem("throughputQueryHistory");
    const queryHistory = savedQueryHistory ? JSON.parse(savedQueryHistory) : [];

    this.state = {
      isLoading: false,
      statusMessage: "",
      currentStep: undefined,
      progress: undefined,
      input: localStorage.getItem("throughputQuery") || tempQuery || "",
      queryHistory: queryHistory,
      currentSprintStartDate: dayjs().toString(),
      numberOfSprints: 4,
      throughputData: [],
      initiatitives: [],
      initiativesSelected: [],
      labels: [],
      labelsSelected: [],
      types: [],
      typesSelected: [],
      accounts: [],
      accountsSelected: [],
      sizeMode: "count",
      splitMode: "initiatives",
      sankeyGroups: [],
    };
  }

  // Add a query to history, keeping only the latest 5 unique entries
  addToQueryHistory = (query: string) => {
    if (!query.trim()) return;

    // Create a new array with the current query at the beginning
    let newHistory = [query];

    // Add previous unique queries, up to a total of 5
    this.state.queryHistory.forEach((historyItem) => {
      if (historyItem !== query && newHistory.length < 5) {
        newHistory.push(historyItem);
      }
    });

    // Update state and localStorage
    this.setState({ queryHistory: newHistory });
    localStorage.setItem("throughputQueryHistory", JSON.stringify(newHistory));
  };

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
    let allLabels = this.arrayOfAllFieldsAsSelectProps(
      throughputData,
      (issue) => {
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
      }
    );
    allLabels.push({
      label: "None",
      value: "None",
    });
    return allLabels;
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
  getTypesAsSelectProps = (throughputData: SprintIssueList[]) => {
    let allTypes = this.arrayOfAllFieldsAsSelectProps(
      throughputData,
      (issue) => {
        return [
          {
            key: issue.type,
            value: {
              label: issue.type,
              value: issue.type,
            },
          },
        ];
      }
    );
    return allTypes;
  };
  getAccountsAsSelectProps = (throughputData: SprintIssueList[]) => {
    let allAccounts = this.arrayOfAllFieldsAsSelectProps(
      throughputData,
      (issue) => {
        return [
          {
            key: issue.account,
            value: {
              label: issue.account,
              value: issue.account,
            },
          },
        ];
      }
    );
    return allAccounts;
  };
  onClick = () => {
    localStorage.setItem("throughputQuery", this.state.input);

    // Add current query to history
    this.addToQueryHistory(this.state.input);

    this.setState({ isLoading: true, statusMessage: "Starting data fetch..." });

    const eventSource = new EventSource(
      "/api/throughput?query=" +
        encodeURIComponent(this.state.input) +
        "&currentSprintStartDate=" +
        encodeURIComponent(this.state.currentSprintStartDate) +
        "&numberOfSprints=" +
        this.state.numberOfSprints
    );

    eventSource.onmessage = (event) => {
      const response = JSON.parse(event.data);

      if (response.status === "processing") {
        this.setState({
          statusMessage: response.message || "Processing...",
          progress: response.progress,
          currentStep: response.step,
        });
      } else if (response.status === "complete" && response.data) {
        const throughputData = JSON.parse(response.data);
        const arrayOfAllInitiatives =
          this.getInitiativesAsSelectProps(throughputData);
        const arrayOfAllLabels = this.getLabelsAsSelectProps(throughputData);
        const arrayOfAllTypes = this.getTypesAsSelectProps(throughputData);
        const arrayOfAllAccounts =
          this.getAccountsAsSelectProps(throughputData);

        this.setState({
          throughputData,
          initiatitives: arrayOfAllInitiatives,
          initiativesSelected: [],
          labels: arrayOfAllLabels,
          labelsSelected: [],
          types: arrayOfAllTypes,
          typesSelected: [],
          accounts: arrayOfAllAccounts,
          accountsSelected: [],
          isLoading: false,
          statusMessage: "",
          progress: undefined,
          currentStep: undefined,
        });
        eventSource.close();
      } else if (response.status === "error") {
        this.setState({
          isLoading: false,
          statusMessage: `Error: ${response.message}`,
          progress: undefined,
          currentStep: undefined,
        });
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      this.setState({
        isLoading: false,
        statusMessage: "Connection error. Please try again.",
        progress: undefined,
        currentStep: undefined,
      });
      eventSource.close();
    };
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
  typesSelected = (selected: string[]) => {
    this.setState({ typesSelected: selected });
  };
  accountsSelected = (selected: string[]) => {
    this.setState({ accountsSelected: selected });
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
      clickData += this.getClickData({
        initiativeKey: "All",
        issues: sprint.issueList,
      });
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

    function getIssuesByLabel(issues: IssueInfo[], filteredLabels: string[]) {
      let issuesByLabel = new ConcatableMap<string, IssueInfo>();

      issues.forEach((issue) => {
        let labels = issue.labels.filter((label) =>
          filteredLabels.includes(label)
        );
        if (labels.length === 0) {
          issuesByLabel.concat("None", issue);
        } else {
          let firstLabel = labels[0];
          issuesByLabel.concat(firstLabel, issue);
        }
        // issue.labels.forEach((label) => {
        //   issuesByLabel.concat(label, issue);
        // });
        // if (issue.labels.length === 0) {
        //   issuesByLabel.concat("None", issue);
        // }
      });
      return issuesByLabel;
    }

    this.state.throughputData.forEach((sprint) => {
      let issuesByLabel = getIssuesByLabel(
        sprint.issueList,
        this.state.labelsSelected
      );
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

  getThroughputByType(throughputData: SprintIssueList[]) {
    let columns: ColumnType[] = [
      { type: "date", label: "Sprint Start Date", identifier: "date" },
    ];
    this.state.typesSelected.forEach((type) => {
      columns.push({
        type: "number",
        label: type,
        identifier: type,
      });
    });
    columns.push({ type: "number", label: "Other", identifier: "Other" });

    let data: WithWildcards<{}>[] = [];

    function getIssuesByType(issues: IssueInfo[], filteredTypes: string[]) {
      let issuesByType = new ConcatableMap<string, IssueInfo>();

      issues.forEach((issue) => {
        if (filteredTypes.includes(issue.type)) {
          issuesByType.concat(issue.type, issue);
        } else {
          issuesByType.concat("Other", issue);
        }
      });
      return issuesByType;
    }

    this.state.throughputData.forEach((sprint) => {
      let issuesByType = getIssuesByType(
        sprint.issueList,
        this.state.typesSelected
      );
      let row: WithWildcards<{}> = {
        date: new Date(sprint.sprintStartingDate),
      };

      let clickData = "";
      this.state.typesSelected.forEach((parent) => {
        let issues = issuesByType.get(parent) || [];
        row[parent] = getSize(issues, this.state.sizeMode);
        clickData += this.getClickData({ initiativeKey: parent, issues });
      });
      let otherTypes = Array.from(issuesByType.keys()).filter(
        (type) => !this.state.typesSelected.includes(type)
      );
      let x: IssueInfo[] = [];
      let otherIssues = otherTypes.reduce((acc, type) => {
        return acc.concat(issuesByType.get(type) || []);
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

  getThroughputByAccount(throughputData: SprintIssueList[]) {
    let columns: ColumnType[] = [
      { type: "date", label: "Sprint Start Date", identifier: "date" },
    ];
    this.state.accountsSelected.forEach((account) => {
      columns.push({
        type: "number",
        label: account,
        identifier: account,
      });
    });
    columns.push({ type: "number", label: "Other", identifier: "Other" });

    let data: WithWildcards<{}>[] = [];

    function getIssuesByAccount(
      issues: IssueInfo[],
      filteredAccounts: string[]
    ) {
      let issuesByAccount = new ConcatableMap<string, IssueInfo>();

      issues.forEach((issue) => {
        if (filteredAccounts.includes(issue.account)) {
          issuesByAccount.concat(issue.account, issue);
        } else {
          issuesByAccount.concat("Other", issue);
        }
      });
      return issuesByAccount;
    }

    this.state.throughputData.forEach((sprint) => {
      let issuesByAccount = getIssuesByAccount(
        sprint.issueList,
        this.state.accountsSelected
      );
      let row: WithWildcards<{}> = {
        date: new Date(sprint.sprintStartingDate),
      };

      let clickData = "";
      this.state.accountsSelected.forEach((parent) => {
        let issues = issuesByAccount.get(parent) || [];
        row[parent] = getSize(issues, this.state.sizeMode);
        clickData += this.getClickData({ initiativeKey: parent, issues });
      });
      let otherAccounts = Array.from(issuesByAccount.keys()).filter(
        (account) => !this.state.accountsSelected.includes(account)
      );
      let x: IssueInfo[] = [];
      let otherIssues = otherAccounts.reduce((acc, account) => {
        return acc.concat(issuesByAccount.get(account) || []);
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

  getThroughputBySankey(throughputData: SprintIssueList[]) {
    let columns: ColumnType[] = [
      { type: "date", label: "Sprint Start Date", identifier: "date" },
    ];

    // Add a column for each sankey group
    this.state.sankeyGroups.forEach((group) => {
      columns.push({
        type: "number",
        label: group.name,
        identifier: group.name,
      });
    });

    // Add "Other" column for issues not in any group
    columns.push({
      type: "number",
      label: "Other",
      identifier: "Other",
    });

    let data: WithWildcards<{}>[] = [];

    // For each sprint, calculate the size of issues that belong to each group
    throughputData.forEach((sprint) => {
      let row: WithWildcards<{}> = {
        date: new Date(sprint.sprintStartingDate),
      };

      let clickData = "";
      let processedIssueKeys = new Set<string>();

      // For each group, find the issues from this sprint that belong to that group
      this.state.sankeyGroups.forEach((group) => {
        const groupIssuesInSprint = sprint.issueList.filter((issue) =>
          group.issues.some((groupIssue) => groupIssue.key === issue.key)
        );

        // Add all processed issue keys to the set
        groupIssuesInSprint.forEach((issue) =>
          processedIssueKeys.add(issue.key)
        );

        row[group.name] = getSize(groupIssuesInSprint, this.state.sizeMode);
        clickData += this.getClickData({
          initiativeKey: group.name,
          issues: groupIssuesInSprint,
        });
      });

      // Find issues that weren't included in any group
      const otherIssues = sprint.issueList.filter(
        (issue) => !processedIssueKeys.has(issue.key)
      );

      row["Other"] = getSize(otherIssues, this.state.sizeMode);
      clickData += this.getClickData({
        initiativeKey: "Other",
        issues: otherIssues,
      });

      row["clickData"] = clickData;
      data.push(row);
    });

    return { data, columns };
  }

  handleSankeyGroupsUpdate = (groups: IssueGroup[]) => {
    // Only update if the groups have actually changed
    if (JSON.stringify(this.state.sankeyGroups) !== JSON.stringify(groups)) {
      this.setState({ sankeyGroups: groups });
    }
  };

  handleQueryChange = (value: string) => {
    this.setState({ input: value });
  };

  render() {
    let { data, columns } =
      this.state.splitMode === "initiatives"
        ? this.getThroughputByInitiative(this.state.throughputData)
        : this.state.splitMode === "labels"
          ? this.getThroughputByLabel(this.state.throughputData)
          : this.state.splitMode === "accounts"
            ? this.getThroughputByAccount(this.state.throughputData)
            : this.state.splitMode === "sankey"
              ? this.getThroughputBySankey(this.state.throughputData)
              : this.getThroughputByType(this.state.throughputData);

    let issueInfo: IssueInfo[] = [];
    this.state.throughputData.forEach((sprint) => {
      issueInfo = issueInfo.concat(sprint.issueList);
    });

    // Create options for the AutoComplete
    const options = this.state.queryHistory.map((query) => ({
      value: query,
      label: query,
    }));

    return (
      <div>
        {/* Error message */}
        {!this.state.isLoading && this.state.statusMessage && (
          <div style={{ textAlign: "center", margin: "20px", color: "red" }}>
            <p>{this.state.statusMessage}</p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <AutoComplete
              style={{ flex: 1 }}
              value={this.state.input}
              options={options}
              onChange={this.handleQueryChange}
              placeholder="Enter query"
            />
            <Button type="primary" onClick={this.onClick}>
              Run Query
            </Button>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ whiteSpace: "nowrap" }}>
              Start Date of Current Sprint:
              <DatePicker
                onChange={this.onSprintStartDateChange}
                value={dayjs(this.state.currentSprintStartDate)}
                style={{ marginLeft: "0.5rem" }}
              />
            </span>
            <span style={{ whiteSpace: "nowrap" }}>
              Number of Sprints:
              <InputNumber
                value={this.state.numberOfSprints}
                onChange={this.onNumberOfSprintsChange}
                style={{ marginLeft: "0.5rem" }}
              />
            </span>
            {issueInfo.length > 0 && (
              <Button
                type="primary"
                onClick={() => createThroughputCSV(issueInfo)}
              >
                Export to CSV
              </Button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Radio.Group
              value={this.state.splitMode}
              onChange={this.handleSplitModeChange}
              style={{ marginRight: "1rem" }}
            >
              <Radio.Button value="initiatives">Initiatives</Radio.Button>
              <Radio.Button value="labels">Labels</Radio.Button>
              <Radio.Button value="types">Types</Radio.Button>
              <Radio.Button value="accounts">Accounts</Radio.Button>
              <Radio.Button value="sankey">Sankey</Radio.Button>
            </Radio.Group>

            <Radio.Group
              value={this.state.sizeMode}
              onChange={this.handleSizeChange}
            >
              <Radio.Button value="count">Count</Radio.Button>
              <Radio.Button value="time booked">Time Booked</Radio.Button>
              <Radio.Button value="estimate">Estimate</Radio.Button>
            </Radio.Group>
          </div>
        </div>

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
        <span
          style={{
            display: this.state.splitMode === "types" ? "" : "none",
          }}
        >
          <Select
            onChange={this.typesSelected.bind(this)}
            options={this.state.types}
          />
        </span>
        <span
          style={{
            display: this.state.splitMode === "accounts" ? "" : "none",
          }}
        >
          <Select
            onChange={this.accountsSelected.bind(this)}
            options={this.state.accounts}
          />
        </span>

        {/* Chart or Loading Indicator */}
        <div
          style={{
            minHeight: "400px",
            position: "relative",
            marginTop: "1rem",
          }}
        >
          {this.state.isLoading ? (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <Spin size="large" />
              <div style={{ marginTop: "10px" }}>
                <p>{this.state.statusMessage}</p>
                {this.state.currentStep && (
                  <p>
                    <strong>Current Stage:</strong>{" "}
                    {this.state.currentStep
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                )}
                {this.state.progress && this.state.progress.totalIssues && (
                  <p>Processing {this.state.progress.totalIssues} issues</p>
                )}
              </div>
            </div>
          ) : (
            <ColumnChart
              data={data}
              columns={columns}
              title="Throughput"
              extraOptions={{ isStacked: true }}
            />
          )}
        </div>
        <InvestmentDiagram
          issues={issueInfo}
          onSankeyGroupsUpdate={this.handleSankeyGroupsUpdate}
        />
      </div>
    );
  }
}
