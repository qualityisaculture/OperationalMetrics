import React from "react";
import { EstimatesData } from "../server/graphManagers/EstimatesGraphManager";
import Select from "./Select";
import EstimateChart from "./EstimateChart";

interface Props {}
interface State {
  input: string;
  allStates: string[];
  allTypes: string[];
  statesSelected: string[];
  typesSelected: string[];
  typeOptions: { value: string; label: string }[];
  stateOptions: { value: string; label: string }[];
}

export default class EstimatesAnalysis extends React.Component<Props, State> {
  state: State; //Remove when TS is fixed.
  setState: any; //Remove when TS is fixed.
  estimatesData: EstimatesData | null;
  constructor(props) {
    super(props);
    this.estimatesData = null;
    this.onClick = this.onClick.bind(this);
    let tempQuery = new URLSearchParams(window.location.search).get(
      "estimatesQuery"
    );
    this.state = {
      input: localStorage.getItem("estimatesQuery") || tempQuery || "",
      allStates: [],
      statesSelected: [],
      allTypes: [],
      typesSelected: [],
      typeOptions: [],
      stateOptions: [],
    };
  }
  onClick() {
    console.log("Button clicked");
    localStorage.setItem("estimatesQuery", this.state.input);
    //Request to the server /api/metrics
    fetch("/api/estimates?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        console.log(JSON.parse(data.data));
        let estimatesData: EstimatesData = JSON.parse(data.data);
        this.estimatesData = estimatesData;
        let uniqueStatuses = estimatesData.uniqueStatuses;
        let uniqueTypesSet = new Set<string>();
        estimatesData.estimateData.forEach((item) => {
          uniqueTypesSet.add(item.type);
        });
        let typeOptions = Array.from(uniqueTypesSet).map((type) => {
          return { value: type, label: type };
        });
        let stateOptions = uniqueStatuses.map((state) => {
          return { value: state, label: state };
        });
        this.setState({
          allStates: uniqueStatuses,
          allTypes: Array.from(uniqueTypesSet),
          statesSelected: uniqueStatuses,
          typesSelected: Array.from(uniqueTypesSet),
          typeOptions: typeOptions,
          stateOptions: stateOptions,
        });
      });
  }

  createCSV(estimatesData: EstimatesData) {
    var csv =
      "key,type,originalEstimate,timeSpent," +
      estimatesData.uniqueStatuses.join(",") +
      "\n";
    estimatesData.estimateData.forEach((item) => {
      if (item.originalEstimate) {
        csv +=
          item.key +
          "," +
          item.type +
          "," +
          item.originalEstimate +
          "," +
          item.timeSpent +
          ",";
        estimatesData.uniqueStatuses.forEach((status) => {
          let statusTime = item.statusTimes.find(
            (statusTime) => statusTime.status === status
          );
          csv += statusTime ? statusTime.days : 0;
          csv += ",";
        });
        csv += "\n";
      }
    });
    var hiddenElement = document.createElement("a");
    hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    hiddenElement.target = "_blank";
    hiddenElement.download = "estimates.csv";
    hiddenElement.click();
  }
  stateSelectedChange = (selected: string[]) => {
    this.setState({ statesSelected: selected });
  };
  typeSelectedChange = (selected: string[]) => {
    this.setState({ typesSelected: selected });
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
        />
        <button onClick={this.onClick}>Click me</button>
        <Select
          options={this.state.stateOptions}
          onChange={this.stateSelectedChange}
        />
        <Select
          options={this.state.typeOptions}
          onChange={this.typeSelectedChange}
        />
        <EstimateChart
          estimatesData={this.estimatesData}
          typesSelected={this.state.typesSelected}
        />
      </div>
    );
  }
}
