import React from "react";
import { Input, Button } from "antd";

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  onGenerate: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default class CumulativeFlowDiagramControls extends React.Component<Props> {
  render() {
    const {
      query,
      onQueryChange,
      onGenerate,
      loading = false,
      disabled = false,
    } = this.props;

    return (
      <div>
        <h2>Cumulative Flow Diagram</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            JQL Query:
          </label>
          <Input.TextArea
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
            }}
            style={{ width: "100%" }}
            placeholder="Enter your JQL query to fetch issues"
            rows={3}
            disabled={disabled}
          />
          <small style={{ color: "#666", display: "block", marginTop: 4 }}>
            Enter a JQL query to fetch issues. Use the chart date picker below
            to filter the display range.
          </small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={onGenerate}
            size="large"
            loading={loading}
            disabled={disabled || loading}
          >
            Generate Diagram
          </Button>
        </div>
      </div>
    );
  }
}
