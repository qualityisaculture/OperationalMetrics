import React from "react";
import { Input, Button, Collapse } from "antd";

type CustomerSLAIssue = {
  key: string;
  summary: string;
  type: string;
  status: string;
  daysInCurrentStatus: number;
  url: string;
};

type StatusGroup = {
  status: string;
  issues: CustomerSLAIssue[];
};

interface Props {}

interface State {
  projectName: string;
  isLoading: boolean;
  statusGroups: StatusGroup[];
}

export default class CustomerSLA extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      projectName: localStorage.getItem("customerSLAProject") || "",
      isLoading: false,
      statusGroups: [],
    };
  }

  handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProjectName = e.target.value;
    this.setState({ projectName: newProjectName });
    localStorage.setItem("customerSLAProject", newProjectName);
  };

  groupIssuesByStatus = (issues: CustomerSLAIssue[]): StatusGroup[] => {
    const statusMap = new Map<string, CustomerSLAIssue[]>();

    // Group issues by status
    issues.forEach((issue) => {
      if (!statusMap.has(issue.status)) {
        statusMap.set(issue.status, []);
      }
      statusMap.get(issue.status)!.push(issue);
    });

    // Convert to array and sort issues within each status by days (descending)
    const statusGroups: StatusGroup[] = Array.from(statusMap.entries()).map(
      ([status, issues]) => ({
        status,
        issues: issues.sort(
          (a, b) => b.daysInCurrentStatus - a.daysInCurrentStatus
        ),
      })
    );

    // Sort status groups by total number of issues (descending)
    statusGroups.sort((a, b) => b.issues.length - a.issues.length);

    return statusGroups;
  };

  handleGetIssues = () => {
    console.log(`Getting issues for project: ${this.state.projectName}`);

    this.setState({ isLoading: true });

    fetch(
      `/api/customerSLA?projectName=${encodeURIComponent(this.state.projectName)}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("API Response:", data);
        const issues: CustomerSLAIssue[] = JSON.parse(data.data);
        console.log("Parsed Issues:", issues);

        const statusGroups = this.groupIssuesByStatus(issues);
        console.log("Status Groups:", statusGroups);

        this.setState({
          statusGroups,
          isLoading: false,
        });
      })
      .catch((error) => {
        console.error("API Error:", error);
        this.setState({
          isLoading: false,
          statusGroups: [],
        });
      });
  };

  render() {
    return (
      <div>
        <h2>Customer SLA Screen</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Project Name:
          </label>
          <Input
            placeholder="Enter project name"
            value={this.state.projectName}
            onChange={this.handleProjectNameChange}
            style={{ width: 300 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={this.handleGetIssues}
            disabled={!this.state.projectName.trim()}
            loading={this.state.isLoading}
          >
            Get Issues
          </Button>
        </div>
        <p>Current project: {this.state.projectName || "None"}</p>

        {this.state.statusGroups.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3>Issues by Status:</h3>
            <Collapse>
              {this.state.statusGroups.map((statusGroup) => (
                <Collapse.Panel
                  header={`${statusGroup.status} (${statusGroup.issues.length} issues)`}
                  key={statusGroup.status}
                >
                  {statusGroup.issues.map((issue) => (
                    <div key={issue.key} style={{ marginBottom: 8 }}>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <strong>{issue.key}</strong>
                      </a>{" "}
                      - {issue.summary} - {issue.type} -{" "}
                      {issue.daysInCurrentStatus} days
                    </div>
                  ))}
                </Collapse.Panel>
              ))}
            </Collapse>
          </div>
        )}
      </div>
    );
  }
}
