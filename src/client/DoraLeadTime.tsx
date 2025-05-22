import React from "react";
import { MappedJiraData } from "../server/graphManagers/DoraLeadTimeForChanges";
import { Input, Button, Table, Collapse, AutoComplete } from "antd";

const { Panel } = Collapse;

type State = {
  projectName: string;
  leadTimeData: MappedJiraData | null;
  projectHistory: string[];
};

export default class DoraLeadTime extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    const storedProjectName = localStorage.getItem("projectName");

    // Load saved project history from localStorage
    const savedProjectHistory = localStorage.getItem("projectNameHistory");
    const projectHistory = savedProjectHistory
      ? JSON.parse(savedProjectHistory)
      : [];

    this.state = {
      projectName: storedProjectName || "",
      leadTimeData: null,
      projectHistory: projectHistory,
    };
  }

  // Add a project name to history, keeping only the latest 5 unique entries
  addToProjectHistory = (projectName: string) => {
    if (!projectName.trim()) return;

    // Create a new array with the current project name at the beginning
    let newHistory = [projectName];

    // Add previous unique project names, up to a total of 5
    this.state.projectHistory.forEach((historyItem) => {
      if (historyItem !== projectName && newHistory.length < 5) {
        newHistory.push(historyItem);
      }
    });

    // Update state and localStorage
    this.setState({ projectHistory: newHistory });
    localStorage.setItem("projectNameHistory", JSON.stringify(newHistory));
  };

  handleClick = async () => {
    try {
      localStorage.setItem("projectName", this.state.projectName);

      // Add current project name to history
      this.addToProjectHistory(this.state.projectName);

      const response = await fetch(
        `/api/doraLeadTime?projectName=${this.state.projectName}`
      );
      const rawData = await response.json();
      const data: MappedJiraData = JSON.parse(rawData.data);
      // Round Dora Lead Time to the nearest day
      data.forEach((item) => {
        item.doraLeadTime = Math.round(item.doraLeadTime);
      });
      this.setState({ leadTimeData: data });
    } catch (error) {
      console.error("Error fetching Dora lead time:", error);
    }
  };

  handleChange = (value: string) => {
    this.setState({ projectName: value });
  };

  render() {
    // Create options for the AutoComplete
    const options = this.state.projectHistory.map((project) => ({
      value: project,
      label: project,
    }));

    const columns = [
      {
        title: "Release",
        dataIndex: "release",
        key: "release",
      },
      {
        title: "Resolved Date",
        dataIndex: "resolvedDate",
        key: "resolvedDate",
      },
      {
        title: "Dora Lead Time (days)",
        dataIndex: "doraLeadTime",
        key: "doraLeadTime",
      },
      {
        title: "Jiras",
        dataIndex: "jiras",
        key: "jiras",
        render: (jiras: { key: string; resolutiondate: string }[]) => (
          <Collapse>
            <Panel header="Jira Details" key="jiras">
              <ul>
                {jiras.map((jira) => (
                  <li key={jira.key}>
                    {jira.key} - {jira.resolutiondate}
                  </li>
                ))}
              </ul>
            </Panel>
          </Collapse>
        ),
      },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <AutoComplete
            style={{ flex: 1 }}
            value={this.state.projectName}
            options={options}
            onChange={this.handleChange}
            placeholder="Enter Project Name"
          />
          <Button onClick={this.handleClick} type="primary">
            Fetch Dora Lead Time
          </Button>
        </div>
        {this.state.leadTimeData && (
          <Table
            dataSource={this.state.leadTimeData}
            columns={columns}
            rowKey="release"
          />
        )}
      </div>
    );
  }
}
