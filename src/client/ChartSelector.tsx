import React from "react";
import { Radio } from "antd";
import type { RadioChangeEvent } from "antd";
import Throughput from "./Throughput";
import EstimatesAnalysis from "./EstimatesAnalysis";
import EpicBurnup from "./EpicBurnup";
import BambooBuilds from "./BambooBuilds";
import TimeInDev from "./TimeInDev";
import LeadTime from "./LeadTime";
import CumulativeFlowDiagram from "./CumulativeFlowDiagram";

interface Props {}

interface State {
  chart:
    | "burnup"
    | "estimate"
    | "throughput"
    | "bamboo"
    | "timeInDev"
    | "leadTime"
    | "cumulativeFlow";
}

export default class ChartSelector extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      chart: "bamboo",
    };
  }
  handleChartChange = (e: RadioChangeEvent) => {
    this.setState({
      chart: e.target.value,
    });
  };
  render() {
    let epicBurnupStyle = {
      display: this.state.chart === "burnup" ? "block" : "none",
    };
    let estimateStyle = {
      display: this.state.chart === "estimate" ? "block" : "none",
    };
    let throughputStyle = {
      display: this.state.chart === "throughput" ? "block" : "none",
    };
    let bambooStyle = {
      display: this.state.chart === "bamboo" ? "block" : "none",
    };
    let timeInDevStyle = {
      display: this.state.chart === "timeInDev" ? "block" : "none",
    };
    let leadTimeStyle = {
      display: this.state.chart === "leadTime" ? "block" : "none",
    };
    let cumulativeFlowStyle = {
      display: this.state.chart === "cumulativeFlow" ? "block" : "none",
    };

    return (
      <div>
        <div>
          <Radio.Group
            value={this.state.chart}
            onChange={this.handleChartChange}
          >
            <Radio.Button value="burnup">Burnup</Radio.Button>
            <Radio.Button value="estimate">Estimate</Radio.Button>
            <Radio.Button value="throughput">Throughput</Radio.Button>
            <Radio.Button value="bamboo">Bamboo Builds</Radio.Button>
            <Radio.Button value="timeInDev">Time In Dev</Radio.Button>
            <Radio.Button value="leadTime">Lead Time</Radio.Button>
            <Radio.Button value="cumulativeFlow">Cumulative Flow</Radio.Button>
          </Radio.Group>
        </div>
        <div>
          <div style={epicBurnupStyle}>
            <EpicBurnup />
          </div>
          <span style={estimateStyle}>
            <EstimatesAnalysis />
          </span>
          <div style={throughputStyle}>
            <Throughput />
          </div>
          <div style={bambooStyle}>
            <BambooBuilds />
          </div>
          <div style={timeInDevStyle}>
            <TimeInDev />
          </div>
          <div style={leadTimeStyle}>
            <LeadTime />
          </div>
          <div style={cumulativeFlowStyle}>
            <CumulativeFlowDiagram />
          </div>
        </div>
      </div>
    );
  }
}
