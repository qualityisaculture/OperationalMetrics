import React from "react";
import { CumulativeFlowDiagramData } from "../server/graphManagers/CumulativeFlowDiagramManager";
import CumulativeFlowDiagramControls from "./CumulativeFlowDiagramControls";
import CumulativeFlowDiagramChart from "./CumulativeFlowDiagramChart";

interface Props {}
interface State {
  input: string;
  cfdData: CumulativeFlowDiagramData | null;
  loading: boolean;
  error: string | null;
}

export default class CumulativeFlowDiagram extends React.Component<
  Props,
  State
> {
  constructor(props) {
    super(props);

    this.state = {
      input: localStorage.getItem("cumulativeFlowQuery") || "",
      cfdData: null,
      loading: false,
      error: null,
    };
  }

  onClick = () => {
    localStorage.setItem("cumulativeFlowQuery", this.state.input);
    console.log("Button clicked");

    this.setState({ loading: true, error: null });

    fetch("/api/cumulativeFlowDiagram?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let cfdData: CumulativeFlowDiagramData = JSON.parse(data.data);
        console.log("Data received:", cfdData);
        this.setState({
          cfdData,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        console.error("Error fetching CFD data:", error);
        this.setState({
          loading: false,
          error: error.message || "Failed to fetch data",
        });
      });
  };

  render() {
    return (
      <div>
        <CumulativeFlowDiagramControls
          query={this.state.input}
          onQueryChange={(query) => this.setState({ input: query })}
          onGenerate={this.onClick}
          loading={this.state.loading}
        />

        <CumulativeFlowDiagramChart
          data={this.state.cfdData}
          loading={this.state.loading}
          error={this.state.error}
        />
      </div>
    );
  }
}
