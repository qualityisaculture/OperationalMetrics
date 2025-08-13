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
import DoraLeadTime from "./DoraLeadTime";
import CustomerSLA from "./CustomerSLA";
import CreatedResolved from "./CreatedResolved";
import TempoAnalyzer from "./TempoAnalyzer";
import TempoReport from "./TempoReport";
import JiraReport from "./JiraReport";
import BottleneckDetector from "./BottleneckDetector";

interface Props {}

interface State {
  chart:
    | "burnup"
    | "estimate"
    | "throughput"
    | "bamboo"
    | "timeInDev"
    | "leadTime"
    | "cumulativeFlow"
    | "doraLeadTime"
    | "customerSLA"
    | "createdResolved"
    | "tempoAnalyzer"
    | "tempoReport"
    | "jiraReport"
    | "bottleneckDetector";
}

export default class ChartSelector extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      chart: "jiraReport",
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
    let doraLeadTimeStyle = {
      display: this.state.chart === "doraLeadTime" ? "block" : "none",
    };
    let customerSLAStyle = {
      display: this.state.chart === "customerSLA" ? "block" : "none",
    };
    let createdResolvedStyle = {
      display: this.state.chart === "createdResolved" ? "block" : "none",
    };
    let tempoAnalyzerStyle = {
      display: this.state.chart === "tempoAnalyzer" ? "block" : "none",
    };
    let tempoReportStyle = {
      display: this.state.chart === "tempoReport" ? "block" : "none",
    };
    let jiraReportStyle = {
      display: this.state.chart === "jiraReport" ? "block" : "none",
    };
    let bottleneckDetectorStyle = {
      display: this.state.chart === "bottleneckDetector" ? "block" : "none",
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
            <Radio.Button value="doraLeadTime">Dora Lead Time</Radio.Button>
            <Radio.Button value="customerSLA">Customer SLA</Radio.Button>
            <Radio.Button value="createdResolved">
              Created / Resolved
            </Radio.Button>
            <Radio.Button value="tempoAnalyzer">Tempo Analyzer</Radio.Button>
            <Radio.Button value="tempoReport">Tempo Report</Radio.Button>
            <Radio.Button value="jiraReport">Jira Report</Radio.Button>
            <Radio.Button value="bottleneckDetector">Bottleneck Detector</Radio.Button>
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
          <div style={doraLeadTimeStyle}>
            <DoraLeadTime />
          </div>
          <div style={customerSLAStyle}>
            <CustomerSLA />
          </div>
          <div style={createdResolvedStyle}>
            <CreatedResolved />
          </div>
          <div style={tempoAnalyzerStyle}>
            <TempoAnalyzer />
          </div>
          <div style={tempoReportStyle}>
            <TempoReport />
          </div>
          <div style={jiraReportStyle}>
            <JiraReport />
          </div>
          <div style={bottleneckDetectorStyle}>
            <BottleneckDetector projectName="PROJECT" />
          </div>
        </div>
      </div>
    );
  }
}
