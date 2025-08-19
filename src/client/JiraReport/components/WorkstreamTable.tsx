import React from "react";
import { JiraIssueWithAggregated } from "../types";
import { UnifiedIssuesTable } from "../../components/tables/UnifiedIssuesTable";

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
  timeDataLoaded?: boolean;
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
  timeDataLoaded = false,
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

  return (
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
    />
  );
};
