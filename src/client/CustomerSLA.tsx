import React from "react";
import { Input, Button, Collapse, Card, Select } from "antd";

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

type StatusCategory = "withUs" | "withCustomer" | "other";

type StatusCategorization = {
  withUs: string[];
  withCustomer: string[];
  other: string[];
};

type Project = {
  id: string;
  key: string;
  name: string;
};

interface Props {}

interface State {
  projectNames: string[];
  isLoading: boolean;
  statusGroups: StatusGroup[];
  statusCategorization: StatusCategorization;
  projects: Project[];
  isLoadingProjects: boolean;
  selectedTypes: string[];
}

export default class CustomerSLA extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    const savedProjects = localStorage.getItem("customerSLAProjects");
    let initialProjects: string[] = [];

    if (savedProjects) {
      try {
        initialProjects = JSON.parse(savedProjects);
      } catch (error) {
        console.error("Error parsing saved projects:", error);
      }
    }

    this.state = {
      projectNames: initialProjects,
      isLoading: false,
      statusGroups: [],
      statusCategorization: {
        withUs: [],
        withCustomer: [],
        other: [],
      },
      projects: [],
      isLoadingProjects: false,
      selectedTypes: [],
    };
  }

  componentDidMount() {
    this.loadProjects();
  }

  loadProjects = () => {
    this.setState({ isLoadingProjects: true });

    console.log("Loading projects from API...");

    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => {
        console.log("Projects API Response:", data);
        const projects: Project[] = JSON.parse(data.data);
        console.log("Parsed Projects:", projects);

        this.setState({
          projects: projects,
          isLoadingProjects: false,
        });
      })
      .catch((error) => {
        console.error("Projects API Error:", error);
        this.setState({
          isLoadingProjects: false,
          projects: [], // Fallback to empty array on error
        });
      });
  };

  handleProjectChange = (values: string[]) => {
    this.setState({ projectNames: values });
    localStorage.setItem("customerSLAProjects", JSON.stringify(values));
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

  getStatusCategorizationStorageKey = () => {
    // Use first project for storage key to maintain some backwards compatibility
    const firstProject = this.state.projectNames[0] || "default";
    return `customerSLA_statusCategories_${firstProject}`;
  };

  loadStatusCategorization = (): StatusCategorization => {
    const storageKey = this.getStatusCategorizationStorageKey();
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved status categorization:", error);
      }
    }

    // Return default empty categorization
    return {
      withUs: [],
      withCustomer: [],
      other: [],
    };
  };

  saveStatusCategorization = (categorization: StatusCategorization) => {
    const storageKey = this.getStatusCategorizationStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(categorization));
  };

  updateStatusCategorization = (issues: CustomerSLAIssue[]) => {
    const allStatuses = [...new Set(issues.map((issue) => issue.status))];
    const savedCategorization = this.loadStatusCategorization();

    // Get all currently categorized statuses
    const categorizedStatuses = new Set([
      ...savedCategorization.withUs,
      ...savedCategorization.withCustomer,
      ...savedCategorization.other,
    ]);

    // Find new statuses that haven't been categorized yet
    const newStatuses = allStatuses.filter(
      (status) => !categorizedStatuses.has(status)
    );

    // Add new statuses to "other" category
    const updatedCategorization: StatusCategorization = {
      withUs: savedCategorization.withUs,
      withCustomer: savedCategorization.withCustomer,
      other: [...savedCategorization.other, ...newStatuses],
    };

    // Save the updated categorization
    this.saveStatusCategorization(updatedCategorization);

    // Update state
    this.setState({
      statusCategorization: updatedCategorization,
    });
  };

  moveStatusToCategory = (status: string, targetCategory: StatusCategory) => {
    const currentCategorization = { ...this.state.statusCategorization };

    // Remove status from all current categories
    currentCategorization.withUs = currentCategorization.withUs.filter(
      (s) => s !== status
    );
    currentCategorization.withCustomer =
      currentCategorization.withCustomer.filter((s) => s !== status);
    currentCategorization.other = currentCategorization.other.filter(
      (s) => s !== status
    );

    // Add status to target category
    currentCategorization[targetCategory].push(status);

    // Sort each category alphabetically for consistent display
    currentCategorization.withUs.sort();
    currentCategorization.withCustomer.sort();
    currentCategorization.other.sort();

    // Save to localStorage
    this.saveStatusCategorization(currentCategorization);

    // Update state
    this.setState({
      statusCategorization: currentCategorization,
    });

    console.log(`Moved "${status}" to ${targetCategory}`);
  };

  handleGetIssues = () => {
    const projectNamesStr = this.state.projectNames.join(", ");
    console.log(`Getting issues for projects: ${projectNamesStr}`);

    this.setState({ isLoading: true });

    const encodedProjectNames = this.state.projectNames.join(",");
    fetch(
      `/api/customerSLA?projectNames=${encodeURIComponent(encodedProjectNames)}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("API Response:", data);
        const issues: CustomerSLAIssue[] = JSON.parse(data.data);
        console.log("Parsed Issues:", issues);

        const statusGroups = this.groupIssuesByStatus(issues);
        console.log("Status Groups:", statusGroups);

        this.updateStatusCategorization(issues);

        // Get all unique types and set them as selected by default
        const allTypes = [...new Set(issues.map((issue) => issue.type))].sort();

        this.setState({
          statusGroups,
          isLoading: false,
          selectedTypes: allTypes, // Set all types as selected by default
        });
      })
      .catch((error) => {
        console.error("API Error:", error);
        this.setState({
          isLoading: false,
          statusGroups: [],
          selectedTypes: [], // Reset to empty on error
        });
      });
  };

  handleTypeChange = (selectedTypes: string[]) => {
    this.setState({ selectedTypes });
  };

  getUniqueTypes = (issues: CustomerSLAIssue[]): string[] => {
    return [...new Set(issues.map((issue) => issue.type))].sort();
  };

  groupIssuesByCategory = (
    issues: CustomerSLAIssue[]
  ): {
    category: string;
    statusGroups: StatusGroup[];
    totalIssues: number;
  }[] => {
    const { statusCategorization, selectedTypes } = this.state;

    // Filter issues by selected types if any are selected
    const filteredIssues =
      selectedTypes.length > 0
        ? issues.filter((issue) => selectedTypes.includes(issue.type))
        : issues;

    // Group issues by status first
    const statusMap = new Map<string, CustomerSLAIssue[]>();
    filteredIssues.forEach((issue) => {
      if (!statusMap.has(issue.status)) {
        statusMap.set(issue.status, []);
      }
      statusMap.get(issue.status)!.push(issue);
    });

    // Helper function to create status groups for a category
    const createStatusGroupsForCategory = (
      statuses: string[]
    ): StatusGroup[] => {
      return statuses
        .filter((status) => statusMap.has(status)) // Only include statuses that have issues
        .map((status) => ({
          status,
          issues: statusMap
            .get(status)!
            .sort((a, b) => b.daysInCurrentStatus - a.daysInCurrentStatus),
        }))
        .sort((a, b) => b.issues.length - a.issues.length); // Sort by issue count
    };

    // Create category groups
    const categoryGroups = [
      {
        category: "With Us",
        statusGroups: createStatusGroupsForCategory(
          statusCategorization.withUs
        ),
        totalIssues: 0,
      },
      {
        category: "With Customer",
        statusGroups: createStatusGroupsForCategory(
          statusCategorization.withCustomer
        ),
        totalIssues: 0,
      },
      {
        category: "Other",
        statusGroups: createStatusGroupsForCategory(statusCategorization.other),
        totalIssues: 0,
      },
    ];

    // Calculate total issues for each category
    categoryGroups.forEach((group) => {
      group.totalIssues = group.statusGroups.reduce(
        (total, statusGroup) => total + statusGroup.issues.length,
        0
      );
    });

    // Filter out categories with no issues and sort by total issues
    return categoryGroups
      .filter((group) => group.totalIssues > 0)
      .sort((a, b) => b.totalIssues - a.totalIssues);
  };

  render() {
    const { statusCategorization, projects, isLoadingProjects, selectedTypes } =
      this.state;
    const categoryGroups =
      this.state.statusGroups.length > 0
        ? this.groupIssuesByCategory(
            this.state.statusGroups.flatMap((group) => group.issues)
          )
        : [];

    // Get unique types from all issues
    const uniqueTypes =
      this.state.statusGroups.length > 0
        ? this.getUniqueTypes(
            this.state.statusGroups.flatMap((group) => group.issues)
          )
        : [];

    return (
      <div>
        <h2>Customer SLA Screen</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Projects:</label>
          <Select
            placeholder="Select one or more projects"
            value={this.state.projectNames || undefined}
            onChange={this.handleProjectChange}
            style={{ width: 400 }}
            loading={isLoadingProjects}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) => {
              if (option && option.children) {
                return (
                  option.children
                    .toString()
                    .toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
                );
              }
              return false;
            }}
            mode="multiple"
          >
            {projects.map((project) => (
              <Select.Option key={project.key} value={project.key}>
                {project.key} - {project.name}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={this.handleGetIssues}
            disabled={!this.state.projectNames.length}
            loading={this.state.isLoading}
          >
            Get Issues
          </Button>
        </div>
        <p>
          Selected projects ({this.state.projectNames.length}):{" "}
          {this.state.projectNames.length > 0
            ? this.state.projectNames.join(", ")
            : "None"}
        </p>

        {this.state.statusGroups.length > 0 && (
          <>
            {/* Add Type Filter */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                Filter by Type:
              </label>
              <Select
                placeholder="Select issue types to filter"
                value={selectedTypes}
                onChange={this.handleTypeChange}
                style={{ width: 400 }}
                mode="multiple"
                allowClear
              >
                {uniqueTypes.map((type) => (
                  <Select.Option key={type} value={type}>
                    {type}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Status Categorization Section */}
            <div style={{ marginTop: 20, marginBottom: 30 }}>
              <h3>Status Categories:</h3>
              <div style={{ display: "flex", gap: 16 }}>
                {/* With Us */}
                <Card
                  title={`With Us (${statusCategorization.withUs.length})`}
                  style={{ flex: 1 }}
                >
                  {statusCategorization.withUs.map((status) => (
                    <div
                      key={status}
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{status}</span>
                      <Button
                        size="small"
                        onClick={() =>
                          this.moveStatusToCategory(status, "other")
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </Card>

                {/* With Customer */}
                <Card
                  title={`With Customer (${statusCategorization.withCustomer.length})`}
                  style={{ flex: 1 }}
                >
                  {statusCategorization.withCustomer.map((status) => (
                    <div
                      key={status}
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{status}</span>
                      <Button
                        size="small"
                        onClick={() =>
                          this.moveStatusToCategory(status, "other")
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </Card>

                {/* Other */}
                <Card
                  title={`Other (${statusCategorization.other.length})`}
                  style={{ flex: 1 }}
                >
                  {statusCategorization.other.map((status) => (
                    <div
                      key={status}
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{status}</span>
                      <div>
                        <Button
                          size="small"
                          style={{ marginRight: 4 }}
                          onClick={() =>
                            this.moveStatusToCategory(status, "withUs")
                          }
                        >
                          → Us
                        </Button>
                        <Button
                          size="small"
                          onClick={() =>
                            this.moveStatusToCategory(status, "withCustomer")
                          }
                        >
                          → Customer
                        </Button>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            </div>

            {/* Issues by Category Section */}
            <div style={{ marginTop: 20 }}>
              <h3>Issues by Category:</h3>
              <Collapse>
                {categoryGroups.map((categoryGroup) => (
                  <Collapse.Panel
                    header={`${categoryGroup.category} (${categoryGroup.totalIssues} issues)`}
                    key={categoryGroup.category}
                  >
                    <Collapse>
                      {categoryGroup.statusGroups.map((statusGroup) => (
                        <Collapse.Panel
                          header={`${statusGroup.status} (${statusGroup.issues.length} issues)`}
                          key={`${categoryGroup.category}-${statusGroup.status}`}
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
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          </>
        )}
      </div>
    );
  }
}
