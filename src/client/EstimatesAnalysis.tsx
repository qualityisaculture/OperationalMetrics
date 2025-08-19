import React from "react";
import { EstimatesData } from "../server/graphManagers/EstimatesGraphManager";
import Select from "./Select";
import EstimateChart from "./EstimateChart";
import { createCSV } from "./Utils";

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
