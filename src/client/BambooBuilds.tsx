import React from "react";
import ColumnChart from "./ColumnChart";
import { Input } from "antd";
import { BuildInfo } from "../server/graphManagers/BambooGraphManager";

interface Props {}
interface State {
  numberData: any;
  percentageData: any;
  projectBuildKey: string;
}

let numberColumns = [
  { type: "string", identifier: "month", label: "Build Date" },
  { type: "number", identifier: "totalBuilds", label: "Total Builds" },
  {
    type: "number",
    identifier: "restartedBuilds",
    label: "Restarted Builds",
  },
  {
    type: "number",
    identifier: "passFirstTimeBuilds",
    label: "Build Passed First Time",
  },
];
let percentageColumns = [
  { type: "string", identifier: "month", label: "Build Date" },
  { type: "number", identifier: "successRate", label: "Success Rate" },
  { type: "number", identifier: "failureRate", label: "Failure Rate" },
  { type: "number", identifier: "restartRate", label: "Restart Rate" },
  {
    type: "number",
    identifier: "passFirstTimeRate",
    label: "Pass First Time Rate",
  },
];
let buildTimeColumns = [
  { type: "string", identifier: "month", label: "Build Date" },
  {
    type: "number",
    identifier: "averageBuildTime",
    label: "Average Build Time",
  },
];

export default class BambooBuilds extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      numberData: [],
      percentageData: [],
      projectBuildKey: localStorage.getItem("projectBuildKey") || "",
    };
  }
  onClick = async () => {
    let bambooData = await fetch(
      `/api/bamboo?projectBuildKey=${this.state.projectBuildKey}`
    )
      .then((response) => response.json())
      .then((data) => {
        let bambooData: BuildInfo = JSON.parse(data.data);
        return bambooData;
      });

    console.log(bambooData);

    this.setState({ numberData: bambooData });
    this.setState({ percentageData: bambooData });
  };
  onProjectBuildKeyChange = (e: any) => {
    this.setState({ projectBuildKey: e.target.value });
    localStorage.setItem("projectBuildKey", e.target.value);
  };
  render() {
    return (
      <div>
        <h1>Bamboo Builds</h1>
        <Input
          value={this.state.projectBuildKey}
          onChange={this.onProjectBuildKeyChange}
        />
        <button onClick={this.onClick}>Get Bamboo Builds</button>
        <ColumnChart
          columns={numberColumns}
          data={this.state.numberData}
          title="Total Builds"
        />
        <ColumnChart
          columns={percentageColumns}
          data={this.state.percentageData}
          title="Failure Percentage"
        />
        <ColumnChart
          columns={buildTimeColumns}
          data={this.state.numberData}
          title="Average Build Time"
        />
      </div>
    );
  }
}
