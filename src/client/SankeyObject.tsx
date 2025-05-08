import React from "react";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { SankeyLink } from "./SankeyDiagram";
import Select from "./Select";
import { DefaultOptionType } from "antd/es/select";
import { Collapse } from "antd";

type SankeySplitBy =
  | "All"
  | "None"
  | "Initiative"
  | "Labels"
  | "Type"
  | "Account"
  | "Epic";
let splitByOptions: DefaultOptionType[] = [
  { value: "All", label: "All" },
  { value: "None", label: "None" },
  { value: "Initiative", label: "Initiative" },
  { value: "Labels", label: "Labels" },
  { value: "Type", label: "Type" },
  { value: "Account", label: "Account" },
  { value: "Epic", label: "Epic" },
];
type SplitResponse = {
  selectedIssues: IssueInfo[];
  otherSankeyObject: React.JSX.Element | null;
  options: DefaultOptionType[];
};

type IssueGroup = {
  name: string;
  issues: IssueInfo[];
};

interface Props {
  issues: IssueInfo[];
  splitBy: SankeySplitBy;
  splitSelected: string[];
  totalSize?: number;
  onIssuesUpdate?: (issueGroups: IssueGroup[]) => void;
}
interface State {
  splitBy: SankeySplitBy;
  otherSankeyObject: React.JSX.Element | null;
  options: DefaultOptionType[];
  optionsSelected: string[];
  selectedIssues: IssueInfo[];
}

function byTimeSpent(
  a: { timeSpent?: number },
  b: { timeSpent?: number }
): number {
  return (b.timeSpent || 0) - (a.timeSpent || 0);
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

  getGroupName(): string {
    const timeSpent = this.getTimeSpent(this.state.selectedIssues);
    const totalSize =
      this.props.totalSize || this.getTimeSpent(this.props.issues);
    const percentage = Math.round((timeSpent / totalSize) * 10000) / 100;
    const optionSelectedString = this.optionSelectedString();
    return `${this.state.splitBy} - ${timeSpent} days (${percentage}%) spent on ${optionSelectedString} (${this.state.selectedIssues.length} issues)`;
  }

  private optionSelectedString() {
    return this.state.options
      .filter((option) =>
        this.state.optionsSelected.includes(option.value as string)
      )
      .map((option) => option.label)
      .join(", ");
  }

  getAllIssuesRecursively(): IssueGroup[] {
    let groups: IssueGroup[] = [
      {
        name: this.optionSelectedString(),
        issues: this.state.selectedIssues,
      },
    ];

    return groups;
  }

  componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    snapshot?: any
  ): void {
    if (
      JSON.stringify(this.props.issues) !== JSON.stringify(prevProps.issues) ||
      JSON.stringify(this.state.selectedIssues) !==
        JSON.stringify(prevState.selectedIssues) ||
      JSON.stringify(this.state.optionsSelected) !==
        JSON.stringify(prevState.optionsSelected)
    ) {
      const issueGroups = this.getAllIssuesRecursively();
      this.props.onIssuesUpdate?.(issueGroups);

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
  }

  setSplitBy(splitBy: SankeySplitBy, optionsSelected?: string[]) {
    const splitResponse = this.getSplitBy(splitBy);
    const defaultOption = String(splitResponse.options[0]?.value || "All");

    // Only use the new optionsSelected if explicitly provided
    const newOptionsSelected =
      optionsSelected !== undefined ? optionsSelected : [defaultOption];

    this.setState(
      {
        splitBy,
        ...splitResponse,
        optionsSelected: newOptionsSelected,
      },
      () => {
        const issueGroups = this.getAllIssuesRecursively();
        this.props.onIssuesUpdate?.(issueGroups);
      }
    );
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
    } else if (splitBy === "Account") {
      return this.splitByAccount();
    } else if (splitBy === "Epic") {
      return this.splitByEpic();
    } else {
      return this.splitByAll();
    }
  }

  setSelectedOptions(optionsSelected: string[]) {
    let newState;
    if (this.state.splitBy === "Initiative") {
      newState = {
        ...this.splitByInitiative(optionsSelected),
        optionsSelected,
        options: this.state.options,
      };
    } else if (this.state.splitBy === "Labels") {
      newState = {
        ...this.splitByLabels(optionsSelected),
        optionsSelected,
        options: this.state.options,
      };
    } else if (this.state.splitBy === "Type") {
      newState = {
        ...this.splitByType(optionsSelected),
        optionsSelected,
        options: this.state.options,
      };
    } else if (this.state.splitBy === "Account") {
      newState = {
        ...this.splitByAccount(optionsSelected),
        optionsSelected,
        options: this.state.options,
      };
    } else if (this.state.splitBy === "Epic") {
      newState = {
        ...this.splitByEpic(optionsSelected),
        optionsSelected,
        options: this.state.options,
      };
    }

    if (newState) {
      this.setState(newState, () => {
        const issueGroups = this.getAllIssuesRecursively();
        this.props.onIssuesUpdate?.(issueGroups);
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
        timeSpent: this.getTimeSpent(initiative.issues),
      });
    });

    return initiatives.sort(byTimeSpent);
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
        timeSpent: this.getTimeSpent(labelIssues),
      });
    });
    return labels.sort(byTimeSpent);
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
        timeSpent: this.getTimeSpent(typeIssues),
      });
    });
    return types.sort(byTimeSpent);
  }

  getAccountKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let accountsMap = new Map<string, IssueInfo[]>();
    issues.forEach((issue) => {
      if (accountsMap.has(issue.account)) {
        //@ts-ignore
        accountsMap.get(issue.account).push(issue);
      } else {
        accountsMap.set(issue.account, [issue]);
      }
    });
    let accounts: DefaultOptionType[] = [];
    accountsMap.forEach((accountIssues, account) => {
      accounts.push({
        value: account,
        label: `${account} - ${this.getTimeSpent(accountIssues)}`,
        timeSpent: this.getTimeSpent(accountIssues),
      });
    });
    return accounts.sort(byTimeSpent);
  }

  getEpicKeys(issues: IssueInfo[]): DefaultOptionType[] {
    let epicsMap = new Map<
      string,
      { key: string; name: string; issues: IssueInfo[] }
    >();
    issues.forEach((issue) => {
      const epicKey = issue.epicKey || "NO_EPIC";
      const epicName = issue.epicName || "No Epic";
      if (epicsMap.has(epicKey)) {
        //@ts-ignore
        epicsMap.get(epicKey).issues.push(issue);
      } else {
        epicsMap.set(epicKey, {
          key: epicKey,
          name: epicName,
          issues: [issue],
        });
      }
    });
    let epics: DefaultOptionType[] = [];
    epicsMap.forEach((epic) => {
      epics.push({
        value: epic.key,
        label: `${epic.key} - ${epic.name} - ${this.getTimeSpent(epic.issues)}`,
        timeSpent: this.getTimeSpent(epic.issues),
      });
    });
    return epics.sort(byTimeSpent);
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
    let otherSankeyObject =
      otherIssues.length > 0 ? (
        <SankeyObject
          key={Math.random()}
          issues={otherIssues}
          splitBy="None"
          splitSelected={["None"]}
          totalSize={
            this.props.totalSize || this.getTimeSpent(this.props.issues)
          }
          onIssuesUpdate={(groups) => {
            const allGroups = [...this.getAllIssuesRecursively(), ...groups];
            this.props.onIssuesUpdate?.(allGroups);
          }}
        />
      ) : null;
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
    let otherSankeyObject =
      otherIssues.length > 0 ? (
        <SankeyObject
          key={Math.random()}
          issues={otherIssues}
          splitBy="None"
          splitSelected={["None"]}
          totalSize={
            this.props.totalSize || this.getTimeSpent(this.props.issues)
          }
          onIssuesUpdate={(groups) => {
            const allGroups = [...this.getAllIssuesRecursively(), ...groups];
            this.props.onIssuesUpdate?.(allGroups);
          }}
        />
      ) : null;
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
    let otherSankeyObject =
      otherIssues.length > 0 ? (
        <SankeyObject
          key={Math.random()}
          issues={otherIssues}
          splitBy="None"
          splitSelected={["None"]}
          totalSize={
            this.props.totalSize || this.getTimeSpent(this.props.issues)
          }
          onIssuesUpdate={(groups) => {
            const allGroups = [...this.getAllIssuesRecursively(), ...groups];
            this.props.onIssuesUpdate?.(allGroups);
          }}
        />
      ) : null;
    return {
      selectedIssues,
      otherSankeyObject,
      options: this.getTypesKeys(this.props.issues),
    };
  }
  splitByAccount(optionsSelected?: string[]): SplitResponse {
    let selectedIssues: IssueInfo[] = [];
    let otherIssues: IssueInfo[] = [];
    optionsSelected = optionsSelected || this.state.optionsSelected;
    this.props.issues.forEach((issue) => {
      if (optionsSelected.includes(issue.account)) {
        selectedIssues.push(issue);
      } else {
        otherIssues.push(issue);
      }
    });
    let otherSankeyObject =
      otherIssues.length > 0 ? (
        <SankeyObject
          key={Math.random()}
          issues={otherIssues}
          splitBy="None"
          splitSelected={["None"]}
          totalSize={
            this.props.totalSize || this.getTimeSpent(this.props.issues)
          }
          onIssuesUpdate={(groups) => {
            const allGroups = [...this.getAllIssuesRecursively(), ...groups];
            this.props.onIssuesUpdate?.(allGroups);
          }}
        />
      ) : null;
    return {
      selectedIssues,
      otherSankeyObject,
      options: this.getAccountKeys(this.props.issues),
    };
  }

  splitByEpic(optionsSelected?: string[]): SplitResponse {
    let selectedIssues: IssueInfo[] = [];
    let otherIssues: IssueInfo[] = [];
    optionsSelected = optionsSelected || this.state.optionsSelected;
    this.props.issues.forEach((issue) => {
      const epicKey = issue.epicKey || "NO_EPIC";
      if (optionsSelected.includes(epicKey)) {
        selectedIssues.push(issue);
      } else {
        otherIssues.push(issue);
      }
    });
    let otherSankeyObject =
      otherIssues.length > 0 ? (
        <SankeyObject
          key={Math.random()}
          issues={otherIssues}
          splitBy="None"
          splitSelected={["None"]}
          totalSize={
            this.props.totalSize || this.getTimeSpent(this.props.issues)
          }
          onIssuesUpdate={(groups) => {
            const allGroups = [...this.getAllIssuesRecursively(), ...groups];
            this.props.onIssuesUpdate?.(allGroups);
          }}
        />
      ) : null;
    return {
      selectedIssues,
      otherSankeyObject,
      options: this.getEpicKeys(this.props.issues),
    };
  }

  render(): React.ReactNode {
    const summaryString = this.getGroupName();
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
            <Collapse>
              <Collapse.Panel header="Issues" key="1">
                {[...this.state.selectedIssues]
                  .sort((a, b) => (b.timespent || 0) - (a.timespent || 0))
                  .map((issue) => (
                    <div key={issue.key}>
                      <a href={issue.url}>{issue.key}</a> - {issue.summary} -{" "}
                      {issue.timespent} days
                    </div>
                  ))}
              </Collapse.Panel>
            </Collapse>
            {this.state.splitBy !== "None" && (
              <Collapse>
                <Collapse.Panel header="Nested Analysis" key="1">
                  <SankeyObject
                    key={Math.random()}
                    issues={this.state.selectedIssues}
                    splitBy="All"
                    splitSelected={["All"]}
                    totalSize={this.getTimeSpent(this.state.selectedIssues)}
                    onIssuesUpdate={this.props.onIssuesUpdate}
                  />
                </Collapse.Panel>
              </Collapse>
            )}
          </Collapse.Panel>
        </Collapse>
        <div key={this.state.otherSankeyObject?.props.name}>
          {this.state.otherSankeyObject}
        </div>
      </div>
    );
  }
}
