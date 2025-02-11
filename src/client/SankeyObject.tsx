import React from "react";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { SankeyLink } from "./SankeyDiagram";
import Select from "./Select";
import { DefaultOptionType } from "antd/es/select";
import { Collapse } from "antd";

type SankeySplitBy = "All" | "None" | "Initiative" | "Labels";
let splitByOptions: DefaultOptionType[] = [
  { value: "All", label: "All" },
  { value: "None", label: "None" },
  { value: "Initiative", label: "Initiative" },
  { value: "Labels", label: "Labels" },
];

interface Props {
  issues: IssueInfo[];
  splitBy: SankeySplitBy;
  splitSelected: string[];
  totalSize?: number;
}
interface State {
  splitBy: SankeySplitBy;
  children: React.JSX.Element[];
  options: DefaultOptionType[];
  optionsSelected: string[];
  selectedIssues: IssueInfo[];
}

export class SankeyObject extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      splitBy: props.splitBy,
      children: [],
      options: [{ value: "All", label: "All" }],
      optionsSelected: props.splitSelected,
      selectedIssues: this.props.issues,
    };
    this.setSplitBy(props.splitBy);
  }

  setSplitBy(splitBy: SankeySplitBy, optionsSelected?: string[]) {
    if (splitBy === "All") {
      let { selected, children, options } = this.splitByAll();
      this.setState({
        splitBy,
        children,
        selectedIssues: selected,
        options: options,
      });
    } else if (splitBy === "Initiative") {
      let { selected, children, options } =
        this.splitByInitiative(optionsSelected);
      this.setState({
        splitBy,
        children,
        selectedIssues: selected,
        options: options,
      });
      // children = this.splitByInitiative();
      // options = this.getInitiativesKeys(this.props.issues);
    } else if (splitBy === "Labels") {
      let { selected, children, options } = this.splitByLabels();
      this.setState({
        splitBy,
        children,
        selectedIssues: selected,
        options: options,
      });
      // children = this.splitByLabels();
      // options = this.getLabelsKeys(this.props.issues);
    } else {
      // children = [];
    }
  }

  setSelectedOptions(options: string[]) {
    // this.setSplitBy(this.state.splitBy, options);
    if (this.state.splitBy === "Initiative") {
      let { selected, children } = this.splitByInitiative(options);
      this.setState({
        optionsSelected: options,
        children,
        selectedIssues: selected,
      });
    } else if (this.state.splitBy === "Labels") {
      let { selected, children } = this.splitByLabels(options);
      this.setState({
        optionsSelected: options,
        children,
        selectedIssues: selected,
      });
    }
  }

  getInitiativesKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let initiativesSet = new Set(issues.map((issue) => issue.initiativeKey));
    let initiatives: DefaultOptionType[] = [];
    initiativesSet.forEach((initiative) => {
      initiatives.push({ value: initiative, label: initiative });
    });
    return initiatives;
  }

  getLabelsKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let labelsSet = new Set(issues.flatMap((issue) => issue.labels));
    let labels: DefaultOptionType[] = [];
    labelsSet.forEach((label) => {
      labels.push({ value: label, label: label });
    });
    return labels;
  }

  getTimeSpent(issues: IssueInfo[]): number {
    return issues.reduce((acc, issue) => acc + (issue.timespent || 0), 0);
  }

  splitByAll(): {
    selected: IssueInfo[];
    children: React.JSX.Element[];
    options: DefaultOptionType[];
  } {
    // return [new SankeyObject("All", this.props.issues, "None", ["None"])];
    return {
      selected: this.props.issues,
      children: [],
      options: [{ value: "None", label: "None" }],
    };
  }

  splitByInitiative(optionsSelected?: string[]): {
    selected: IssueInfo[];
    children: React.JSX.Element[];
    options: DefaultOptionType[];
  } {
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
    let children = [
      <SankeyObject
        issues={otherIssues}
        splitBy="None"
        splitSelected={["None"]}
        totalSize={this.props.totalSize || this.getTimeSpent(this.props.issues)}
      />,
    ];
    return {
      selected: selectedIssues,
      children,
      options: this.getInitiativesKeys(this.props.issues),
    };
  }
  splitByLabels(optionsSelected?: string[]): {
    selected: IssueInfo[];
    children: React.JSX.Element[];
    options: DefaultOptionType[];
  } {
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
    let children: any[] = [
      <SankeyObject
        issues={otherIssues}
        splitBy="None"
        splitSelected={["None"]}
        totalSize={this.props.totalSize || this.getTimeSpent(this.props.issues)}
      />,
    ];
    return {
      selected: selectedIssues,
      children,
      options: this.getLabelsKeys(this.props.issues),
    };
  }

  render(): React.ReactNode {
    let timeSpent = this.getTimeSpent(this.state.selectedIssues);
    let totalSize =
      this.props.totalSize || this.getTimeSpent(this.props.issues);
    let percentage = (timeSpent / totalSize) * 100;
    return (
      <div>
        <Select
          options={splitByOptions}
          onChange={this.setSplitBy.bind(this)}
          mode="single"
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
          <Collapse.Panel
            header={`${this.state.selectedIssues.length} issues`}
            key="1"
          >
            {this.state.selectedIssues.map((issue) => (
              <div key={issue.key}>
                {issue.key} - {issue.summary}
              </div>
            ))}
          </Collapse.Panel>
        </Collapse>
        {/* {this.state.selectedIssues.map((issue) => (
          <div key={issue.key}>
            {issue.key} - {issue.summary}
          </div>
        ))} */}
        {this.state.children.map((child: React.JSX.Element) => (
          <div key={child.props.name}>{child}</div>
        ))}
      </div>
    );
  }
}
