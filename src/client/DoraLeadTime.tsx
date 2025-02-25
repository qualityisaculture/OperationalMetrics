import React from "react";
import { MappedJiraData } from "../server/graphManagers/DoraLeadTimeForChanges";
import { Input, Button, Table, Collapse } from "antd";

const { Panel } = Collapse;

type State = {
  projectName: string;
  leadTimeData: MappedJiraData | null;
};

export default class DoraLeadTime extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    const storedProjectName = localStorage.getItem("projectName");
    this.state = {
      projectName: storedProjectName || "",
      leadTimeData: null,
    };
  }

  handleClick = async () => {
    try {
      localStorage.setItem("projectName", this.state.projectName);
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

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ projectName: e.target.value });
  };

  render() {
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
      <div>
        <Input
          type="text"
          value={this.state.projectName}
          onChange={this.handleChange}
          placeholder="Enter Project Name"
        />
        <Button onClick={this.handleClick} type="primary">
          Fetch Dora Lead Time
        </Button>
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
