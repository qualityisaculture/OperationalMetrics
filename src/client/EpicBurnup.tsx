import React from "react";
import type { RadioChangeEvent } from "antd";
import { Radio, Button } from "antd";
import { CSSProperties } from "react";

import EpicBurnupChart from "./EpicBurnupChart";

interface Props {}

interface State {
  input: string;
  queries: string[];
  estimationMode: "count" | "estimate";
  order: number[]; // Array of indices representing the current order
}

const styles: Record<string, CSSProperties> = {
  chartsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(600px, 1fr))",
    gap: "2rem",
    marginTop: "2rem",
  },
  chartContainer: {
    position: "relative",
    background: "white",
    padding: "1rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  chartControls: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    zIndex: 1,
  },
  button: {
    padding: "4px 8px",
    height: "auto",
    lineHeight: 1,
    fontSize: "16px",
  },
  disabledButton: {
    opacity: 0.3,
    cursor: "not-allowed",
  },
};

export default class EpicBurnupClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      input: localStorage.getItem("epicIssueKey") || "",
      queries: [],
      estimationMode: "count",
      order: [], // Initialize empty order array
    };
  }

  onDataRequested = () => {
    localStorage.setItem("epicIssueKey", this.state.input);
    const queries = this.state.input
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q);
    // Initialize order array with sequential indices
    this.setState({ queries, order: queries.map((_, index) => index) });
  };

  onEstimationModeChange = (e: RadioChangeEvent) => {
    this.setState({ estimationMode: e.target.value });
  };

  // Function to move a chart up or down
  moveChart = (index: number, direction: "up" | "down") => {
    const { order, queries } = this.state;
    const newOrder = [...order];
    const currentPosition = newOrder.indexOf(index);

    if (direction === "up" && currentPosition > 0) {
      // Swap with the element above
      [newOrder[currentPosition], newOrder[currentPosition - 1]] = [
        newOrder[currentPosition - 1],
        newOrder[currentPosition],
      ];
    } else if (direction === "down" && currentPosition < newOrder.length - 1) {
      // Swap with the element below
      [newOrder[currentPosition], newOrder[currentPosition + 1]] = [
        newOrder[currentPosition + 1],
        newOrder[currentPosition],
      ];
    }

    // Update the order state
    this.setState({ order: newOrder }, () => {
      // Update the input string and localStorage with the new order
      const newQueries = newOrder.map((i) => queries[i]);
      const newInput = newQueries.join("; ");
      this.setState({ input: newInput });
      localStorage.setItem("epicIssueKey", newInput);
    });
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
        <div style={styles.chartsContainer}>
          {this.state.order.map((queryIndex, displayIndex) => (
            <div key={queryIndex} style={styles.chartContainer}>
              <div style={styles.chartControls}>
                <Button
                  type="text"
                  icon="↑"
                  onClick={() => this.moveChart(queryIndex, "up")}
                  disabled={displayIndex === 0}
                  style={
                    displayIndex === 0
                      ? { ...styles.button, ...styles.disabledButton }
                      : styles.button
                  }
                />
                <Button
                  type="text"
                  icon="↓"
                  onClick={() => this.moveChart(queryIndex, "down")}
                  disabled={displayIndex === this.state.queries.length - 1}
                  style={
                    displayIndex === this.state.queries.length - 1
                      ? { ...styles.button, ...styles.disabledButton }
                      : styles.button
                  }
                />
              </div>
              <EpicBurnupChart
                query={this.state.queries[queryIndex]}
                estimationMode={this.state.estimationMode}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
}
