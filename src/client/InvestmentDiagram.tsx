import SankeyDiagram, { SankeyLink } from "./SankeyDiagram";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import React from "react";
import { SankeyObject } from "./SankeyObject";
import Select from "./Select";
import { DefaultOptionType } from "antd/es/select";

interface Props {
  issues: IssueInfo[];
}
interface State {
  diagramSelected: string;
  selectedSplitBy: string;
  options: { value: string; label: string }[];
  optionsSelected: string[];
}

export default class InvestmentDiagram extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      diagramSelected: "Start",
      selectedSplitBy: "All",
      options: [{ value: "All", label: "All" }],
      optionsSelected: ["All"],
    };
  }

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
        />
      </div>
    );
  }
}
