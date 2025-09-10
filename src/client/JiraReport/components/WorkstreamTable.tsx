import React from "react";
import { JiraIssueWithAggregated } from "../types";
import { UnifiedIssuesTable } from "../../components/tables/UnifiedIssuesTable";
import { Typography, List } from "antd";

interface Props {
  currentIssues: JiraIssueWithAggregated[];
  favoriteItems: Set<string>;
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  getSortedItems: <T extends { key: string }>(items: T[]) => T[];
  getWorkstreamDataCellSpan: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };
  handleIssueClick: (issue: JiraIssueWithAggregated) => void;
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void;
  // Add projectIssues to access complete hierarchy
  projectIssues?: JiraIssueWithAggregated[];

  // Time Bookings
  onRequestTimeBookings?: (fromDate: string) => void;
  timeDataLoaded?: Set<string>;
  currentWorkstreamKey?: string;
}

export const WorkstreamTable: React.FC<Props> = ({
  currentIssues,
  favoriteItems,
  navigationStack,
  getSortedItems,
  getWorkstreamDataCellSpan,
  handleIssueClick,
  toggleFavorite,
  projectIssues,
  onRequestTimeBookings,
  timeDataLoaded = new Set(),
  currentWorkstreamKey,
}) => {
  // Find the complete hierarchical data for the current workstream
  // We need to find the workstream in projectIssues that matches the current level
  const currentLevelData = navigationStack[navigationStack.length - 1];
  let completeHierarchicalData = currentIssues;

  if (projectIssues && currentLevelData) {
    // Find the workstream in projectIssues that matches the current level
    const workstreamKey = currentLevelData.key;
    const workstreamInProject = projectIssues.find(
      (ws) => ws.key === workstreamKey
    );

    if (workstreamInProject) {
      // Use the complete workstream data from projectIssues
      // However, projectIssues might not have the complete hierarchy loaded
      // So we'll use the currentIssues which should have the direct children
      // and let the export function handle the recursion if children are available
      completeHierarchicalData = currentIssues;
    }
  }

  // Recursive function to find all Epic issues in the tree
  const findAllEpicIssues = (
    issues: JiraIssueWithAggregated[]
  ): JiraIssueWithAggregated[] => {
    const epicIssues: JiraIssueWithAggregated[] = [];

    for (const issue of issues) {
      // Check if current issue is an Epic in Progress
      if (issue.type === "Epic" && issue.status === "In Progress") {
        epicIssues.push(issue);
      }

      // Recursively check children
      if (issue.children && issue.children.length > 0) {
        epicIssues.push(...findAllEpicIssues(issue.children));
      }
    }

    return epicIssues;
  };

  // Find all Epic issues that are In Progress in the entire tree
  const epicIssuesInProgress = findAllEpicIssues(currentIssues);

  return (
    <div>
      <UnifiedIssuesTable
        title={`Issues in ${navigationStack[navigationStack.length - 1].name}`}
        dataSource={currentIssues}
        rowKey="key"
        showFavoriteColumn={true}
        favoriteItems={favoriteItems}
        toggleFavorite={toggleFavorite}
        navigationStack={navigationStack}
        currentIssues={currentIssues}
        getWorkstreamDataCellSpan={getWorkstreamDataCellSpan}
        getSortedItems={getSortedItems}
        showExportButton={true}
        workstreamName={navigationStack[navigationStack.length - 1].name}
        parentWorkstreamKey={navigationStack[navigationStack.length - 1].key}
        completeHierarchicalData={completeHierarchicalData}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} issues`,
        }}
        onRow={(record) => ({
          onClick: () => handleIssueClick(record),
          style: {
            cursor: record.childCount > 0 ? "pointer" : "default",
            backgroundColor: record.childCount > 0 ? "#fafafa" : "transparent",
          },
        })}
        onRequestTimeBookings={onRequestTimeBookings}
        timeDataLoaded={timeDataLoaded}
        currentWorkstreamKey={currentWorkstreamKey}
      />

      {epicIssuesInProgress.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <Typography.Title level={4}>Epic Issues In Progress</Typography.Title>
          <List
            size="small"
            dataSource={epicIssuesInProgress}
            renderItem={(issue) => (
              <List.Item>
                <Typography.Text strong>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    {issue.key}
                  </a>
                </Typography.Text>
                <Typography.Text style={{ marginLeft: "8px" }}>
                  {issue.summary}
                </Typography.Text>
                {issue.dueDate && (
                  <Typography.Text
                    type="secondary"
                    style={{ marginLeft: "16px", fontSize: "12px" }}
                  >
                    Due: {new Date(issue.dueDate).toLocaleDateString()}
                  </Typography.Text>
                )}
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};
