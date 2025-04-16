import SankeyDiagram, { SankeyLink } from "./SankeyDiagram";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import React from "react";
import { SankeyObject } from "./SankeyObject";
import Select from "./Select";
import { DefaultOptionType } from "antd/es/select";

type IssueGroup = {
  name: string;
  issues: IssueInfo[];
};

interface Props {
  issues: IssueInfo[];
  onSankeyGroupsUpdate?: (groups: IssueGroup[]) => void;
}

interface State {
  diagramSelected: string;
  selectedSplitBy: string;
  options: { value: string; label: string }[];
  optionsSelected: string[];
  sankeyGroups: IssueGroup[];
}

export default class InvestmentDiagram extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      diagramSelected: "Start",
      selectedSplitBy: "All",
      options: [{ value: "All", label: "All" }],
      optionsSelected: ["All"],
      sankeyGroups: [],
    };
  }

  handleSankeyIssuesUpdate = (issueGroups: IssueGroup[]) => {
    // Only update if the groups have actually changed
    if (
      JSON.stringify(this.state.sankeyGroups) !== JSON.stringify(issueGroups)
    ) {
      this.setState({ sankeyGroups: issueGroups });
      this.props.onSankeyGroupsUpdate?.(issueGroups);
    }
  };

  objectSelected = (source: string) => {
    this.setState({ diagramSelected: source });
  };

  render() {
    return (
      <div>
        {this.state.diagramSelected}
        <SankeyObject
          issues={this.props.issues}
          splitBy="All"
          splitSelected={["All"]}
          onIssuesUpdate={this.handleSankeyIssuesUpdate}
        />
      </div>
    );
  }
}
