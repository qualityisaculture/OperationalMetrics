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
}

export const IssuesTable: React.FC<Props> = ({
  currentIssues,
  favoriteItems,
  navigationStack,
  getSortedItems,
  getWorkstreamDataCellSpan,
  handleIssueClick,
  toggleFavorite,
}) => {
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
    />
  );
};
