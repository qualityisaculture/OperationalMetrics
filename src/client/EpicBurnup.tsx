import React from "react";
import type { RadioChangeEvent } from "antd";
import { Radio } from "antd";

import EpicBurnupChart from "./EpicBurnupChart";
// import "./EpicBurnup.css";

interface Props {}
interface State {
  input: string;
  queries: string[];
  estimationMode: "count" | "estimate";
}

export default class EpicBurnupClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      input: localStorage.getItem("epicIssueKey") || "",
      queries: [],
      estimationMode: "count",
    };
  }

  onDataRequested = () => {
    localStorage.setItem("epicIssueKey", this.state.input);
    const queries = this.state.input
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q);
    this.setState({ queries });
  };

  onEstimationModeChange = (e: RadioChangeEvent) => {
    this.setState({ estimationMode: e.target.value });
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
          placeholder="Enter queries separated by semicolons"
        />
        <button onClick={this.onDataRequested}>Load Queries</button>
        <Radio.Group
          value={this.state.estimationMode}
          onChange={this.onEstimationModeChange}
        >
          <Radio.Button value="count">Count</Radio.Button>
          <Radio.Button value="estimate">Estimate</Radio.Button>
        </Radio.Group>
        <div className="epic-burnup-charts">
          {this.state.queries.map((query, index) => (
            <EpicBurnupChart
              key={index}
              query={query}
              estimationMode={this.state.estimationMode}
            />
          ))}
        </div>
      </div>
    );
  }
}
