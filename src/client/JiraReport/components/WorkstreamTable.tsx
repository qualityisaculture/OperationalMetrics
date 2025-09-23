import React, { useState } from "react";
import { JiraIssueWithAggregated } from "../types";
import { UnifiedIssuesTable } from "../../components/tables/UnifiedIssuesTable";
import { EpicIssuesList } from "./EpicIssuesList";
import { Collapse, Typography, Button, Space } from "antd";
import { DownOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";

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

  // Orphan Detection
  onRequestOrphanDetection?: (workstreamKey: string) => void;
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
  onRequestOrphanDetection,
}) => {
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [isEpicListCollapsed, setIsEpicListCollapsed] = useState(false);
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
      <Collapse
        activeKey={isTableCollapsed ? [] : ["table"]}
        onChange={(keys) => setIsTableCollapsed(keys.length === 0)}
        ghost
        style={{ marginBottom: "16px" }}
      >
        <Collapse.Panel
          key="table"
          header={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                {isTableCollapsed ? <RightOutlined /> : <DownOutlined />}
                <Typography.Title
                  level={4}
                  style={{ margin: 0, marginLeft: "8px" }}
                >
                  Issues in {navigationStack[navigationStack.length - 1].name}
                </Typography.Title>
              </div>
              {/* Orphan detect button removed - now auto-triggered on workstream load */}
            </div>
          }
          showArrow={false}
        >
          <UnifiedIssuesTable
            title=""
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
            parentWorkstreamKey={
              navigationStack[navigationStack.length - 1].key
            }
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
                backgroundColor:
                  record.childCount > 0 ? "#fafafa" : "transparent",
              },
            })}
            onRequestTimeBookings={onRequestTimeBookings}
            timeDataLoaded={timeDataLoaded}
            currentWorkstreamKey={currentWorkstreamKey}
          />
        </Collapse.Panel>
      </Collapse>

      {epicIssuesInProgress.length > 0 && (
        <Collapse
          activeKey={isEpicListCollapsed ? [] : ["epics"]}
          onChange={(keys) => setIsEpicListCollapsed(keys.length === 0)}
          ghost
        >
          <Collapse.Panel
            key="epics"
            header={
              <div style={{ display: "flex", alignItems: "center" }}>
                {isEpicListCollapsed ? <RightOutlined /> : <DownOutlined />}
                <Typography.Title
                  level={4}
                  style={{ margin: 0, marginLeft: "8px" }}
                >
                  Epic Issues In Progress ({epicIssuesInProgress.length})
                </Typography.Title>
              </div>
            }
            showArrow={false}
          >
            <EpicIssuesList epicIssues={epicIssuesInProgress} />
          </Collapse.Panel>
        </Collapse>
      )}
    </div>
  );
};
