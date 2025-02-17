import React from "react";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { SankeyLink } from "./SankeyDiagram";
import Select from "./Select";
import { DefaultOptionType } from "antd/es/select";
import { Collapse } from "antd";

type SankeySplitBy = "All" | "None" | "Initiative" | "Labels" | "Type";
let splitByOptions: DefaultOptionType[] = [
  { value: "All", label: "All" },
  { value: "None", label: "None" },
  { value: "Initiative", label: "Initiative" },
  { value: "Labels", label: "Labels" },
  { value: "Type", label: "Type" },
];
type SplitResponse = {
  selectedIssues: IssueInfo[];
  otherSankeyObject: React.JSX.Element | null;
  options: DefaultOptionType[];
};

interface Props {
  issues: IssueInfo[];
  splitBy: SankeySplitBy;
  splitSelected: string[];
  totalSize?: number;
}
interface State {
  splitBy: SankeySplitBy;
  otherSankeyObject: React.JSX.Element | null;
  options: DefaultOptionType[];
  optionsSelected: string[];
  selectedIssues: IssueInfo[];
}

export class SankeyObject extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      splitBy: props.splitBy,
      otherSankeyObject: null,
      options: [{ value: "All", label: "All" }],
      optionsSelected: props.splitSelected,
      selectedIssues: this.props.issues,
    };
  }

  componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    snapshot?: any
  ): void {
    if (this.props.issues !== prevProps.issues) {
      let { selectedIssues, otherSankeyObject, options } = this.getSplitBy(
        this.state.splitBy
      );
      this.setState({
        selectedIssues: this.props.issues,
        options,
      });
    }
  }

  setSplitBy(splitBy: SankeySplitBy, optionsSelected?: string[]) {
    this.setState({ splitBy });
    this.setState(this.getSplitBy(splitBy));
  }

  getSplitBy(splitBy: SankeySplitBy): SplitResponse {
    if (splitBy === "All") {
      return this.splitByAll();
    } else if (splitBy === "Initiative") {
      return this.splitByInitiative();
    } else if (splitBy === "Labels") {
      return this.splitByLabels();
    } else if (splitBy === "Type") {
      return this.splitByType();
    } else {
      return this.splitByAll();
    }
  }

  setSelectedOptions(optionsSelected: string[]) {
    if (this.state.splitBy === "Initiative") {
      this.setState({
        ...this.splitByInitiative(optionsSelected),
        optionsSelected,
        options: this.state.options,
      });
    } else if (this.state.splitBy === "Labels") {
      this.setState({
        ...this.splitByLabels(optionsSelected),
        optionsSelected,
        options: this.state.options,
      });
    } else if (this.state.splitBy === "Type") {
      this.setState({
        ...this.splitByType(optionsSelected),
        optionsSelected,
        options: this.state.options,
      });
    }
  }

  getInitiativesKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let initiativesMap = new Map<
      string,
      { key: string; summary: string; issues: IssueInfo[] }
    >();
    issues.forEach((issue) => {
      if (initiativesMap.has(issue.initiativeKey)) {
        //@ts-ignore
        initiativesMap.get(issue.initiativeKey).issues.push(issue);
      } else {
        initiativesMap.set(issue.initiativeKey, {
          key: issue.initiativeKey,
          summary: issue.initiativeName,
          issues: [issue],
        });
      }
    });
    let initiatives: DefaultOptionType[] = [];
    initiativesMap.forEach((initiative) => {
      initiatives.push({
        value: initiative.key,
        label: `${initiative.key} - ${initiative.summary} - ${this.getTimeSpent(initiative.issues)}`,
      });
    });

    return initiatives;
  }

  getLabelsKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let labelsMap = new Map<string, IssueInfo[]>();
    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
        if (labelsMap.has(label)) {
          //@ts-ignore
          labelsMap.get(label).push(issue);
        } else {
          labelsMap.set(label, [issue]);
        }
      });
    });
    let labels: DefaultOptionType[] = [];
    labelsMap.forEach((labelIssues, label) => {
      labels.push({
        value: label,
        label: `${label} - ${this.getTimeSpent(labelIssues)}`,
      });
    });
    return labels;
  }

  getTypesKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let typesMap = new Map<string, IssueInfo[]>();
    issues.forEach((issue) => {
      if (typesMap.has(issue.type)) {
        //@ts-ignore
        typesMap.get(issue.type).push(issue);
      } else {
        typesMap.set(issue.type, [issue]);
      }
    });
    let types: DefaultOptionType[] = [];
    typesMap.forEach((typeIssues, type) => {
      types.push({
        value: type,
        label: `${type} - ${this.getTimeSpent(typeIssues)}`,
      });
    });
    return types;
  }

  getTimeSpent(issues: IssueInfo[]): number {
    let rawTimeSpent = issues.reduce(
      (acc, issue) => acc + (issue.timespent || 0),
      0
    );
    return Math.floor(rawTimeSpent);
  }

  splitByAll(): SplitResponse {
    // return [new SankeyObject("All", this.props.issues, "None", ["None"])];
    return {
      selectedIssues: this.props.issues,
      otherSankeyObject: null,
      options: [{ value: "None", label: "None" }],
    };
  }

  splitByInitiative(optionsSelected?: string[]): SplitResponse {
    let selectedIssues: IssueInfo[] = [];
    let otherIssues: IssueInfo[] = [];
    optionsSelected = optionsSelected || this.state.optionsSelected;
    this.props.issues.forEach((issue) => {
      if (optionsSelected.includes(issue.initiativeKey)) {
        selectedIssues.push(issue);
      } else {
        otherIssues.push(issue);
      }
    });
    let otherSankeyObject = (
      <SankeyObject
        key={Math.random()}
        issues={otherIssues}
        splitBy="None"
        splitSelected={["None"]}
        totalSize={this.props.totalSize || this.getTimeSpent(this.props.issues)}
      />
    );
    return {
      selectedIssues,
      otherSankeyObject,
      options: this.getInitiativesKeys(this.props.issues),
    };
  }
  splitByLabels(optionsSelected?: string[]): SplitResponse {
    let selectedIssues: IssueInfo[] = [];
    let otherIssues: IssueInfo[] = [];
    optionsSelected = optionsSelected || this.state.optionsSelected;
    this.props.issues.forEach((issue) => {
      if (optionsSelected.some((label) => issue.labels.includes(label))) {
        selectedIssues.push(issue);
      } else {
        otherIssues.push(issue);
      }
    });
    let otherSankeyObject = (
      <SankeyObject
        issues={otherIssues}
        splitBy="None"
        splitSelected={["None"]}
        totalSize={this.props.totalSize || this.getTimeSpent(this.props.issues)}
      />
    );
    return {
      selectedIssues,
      otherSankeyObject,
      options: this.getLabelsKeys(this.props.issues),
    };
  }
  splitByType(optionsSelected?: string[]): SplitResponse {
    let selectedIssues: IssueInfo[] = [];
    let otherIssues: IssueInfo[] = [];
    optionsSelected = optionsSelected || this.state.optionsSelected;
    this.props.issues.forEach((issue) => {
      if (optionsSelected.includes(issue.type)) {
        selectedIssues.push(issue);
      } else {
        otherIssues.push(issue);
      }
    });
    let otherSankeyObject = (
      <SankeyObject
        issues={otherIssues}
        splitBy="None"
        splitSelected={["None"]}
        totalSize={this.props.totalSize || this.getTimeSpent(this.props.issues)}
      />
    );
    return {
      selectedIssues,
      otherSankeyObject,
      options: this.getTypesKeys(this.props.issues),
    };
  }

  render(): React.ReactNode {
    let timeSpent = this.getTimeSpent(this.state.selectedIssues);
    let totalSize =
      this.props.totalSize || this.getTimeSpent(this.props.issues);
    let percentage = Math.round((timeSpent / totalSize) * 10000) / 100;
    let optionSelectedString = this.state.options
      .filter((option) =>
        this.state.optionsSelected.includes(option.value as string)
      )
      .map((option) => option.label)
      .join(", ");
    let summaryString = `${timeSpent} days (${percentage}%) spent on ${optionSelectedString} (${this.state.selectedIssues.length} issues)`;
    return (
      <div>
        <Collapse>
          <Collapse.Panel header={`${summaryString}`} key="1">
            <Select
              options={splitByOptions}
              onChange={this.setSplitBy.bind(this)}
              mode="single"
              selected={[this.state.splitBy]}
            />
            <Select
              options={this.state.options}
              onChange={this.setSelectedOptions.bind(this)}
            />
            {this.state.splitBy +
              " - " +
              timeSpent +
              " days -  " +
              percentage +
              "%"}
            <Collapse>
              <Collapse.Panel header="Issues" key="1">
                {this.state.selectedIssues
                  .sort((a, b) => (b.timespent || 0) - (a.timespent || 0))
                  .map((issue) => (
                    <div key={issue.key}>
                      <a href={issue.url}>{issue.key}</a> - {issue.summary} -{" "}
                      {issue.timespent} days
                    </div>
                  ))}
              </Collapse.Panel>
            </Collapse>
          </Collapse.Panel>
        </Collapse>
        <div key={this.state.otherSankeyObject?.props.name}>
          {this.state.otherSankeyObject}
        </div>
      </div>
    );
  }
}
