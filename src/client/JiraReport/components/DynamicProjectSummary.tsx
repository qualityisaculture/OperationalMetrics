import React, { useState, useEffect } from "react";
import { Table, Card, Space, Typography, Button, Tooltip } from "antd";
import { InfoCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { JiraIssueWithAggregated } from "../types";
import { getIssueColumns } from "./tables/issueColumns";
import { ProjectSummary } from "./ProjectSummary";
import { ProjectAggregatedData } from "../types";
import { exportWorkstreamToExcel } from "../utils/excelExport";

const { Text } = Typography;

interface Props {
  projectIssues: JiraIssueWithAggregated[];
  favoriteItems: Set<string>;
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
    }
  >;
  getSortedItems: <T extends { key: string }>(items: T[]) => T[];
  getWorkstreamDataCellSpan: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };
  handleWorkstreamClick: (workstream: JiraIssueWithAggregated) => void;
  showRequestAllModal: () => void;
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void;
  projectAggregatedData: ProjectAggregatedData | null;
  projectName: string;
}

export const DynamicProjectSummary: React.FC<Props> = ({
  projectIssues,
  favoriteItems,
  navigationStack,
  loadedWorkstreamData,
  getSortedItems,
  getWorkstreamDataCellSpan,
  handleWorkstreamClick,
  showRequestAllModal,
  toggleFavorite,
  projectAggregatedData,
  projectName,
}) => {
  const [filteredData, setFilteredData] = useState<JiraIssueWithAggregated[]>(
    []
  );
  const [isFiltered, setIsFiltered] = useState(false);

  // Prepare the data source with aggregated values
  const prepareDataSource = () => {
    return getSortedItems(
      projectIssues.map((issue) => {
        const loadedData = loadedWorkstreamData.get(issue.key);
        return loadedData
          ? {
              ...issue,
              aggregatedOriginalEstimate: loadedData.aggregatedOriginalEstimate,
              aggregatedTimeSpent: loadedData.aggregatedTimeSpent,
              aggregatedTimeRemaining: loadedData.aggregatedTimeRemaining,
            }
          : issue;
      })
    );
  };

  const dataSource = prepareDataSource();

  // Handle table change (filtering, sorting, pagination)
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log("Table change:", { pagination, filters, sorter });

    // Check if any filters are applied
    const hasFilters = Object.values(filters as Record<string, any[]>).some(
      (filter: any) => filter && filter.length > 0
    );

    console.log("Has filters:", hasFilters, "Filters:", filters);

    if (hasFilters) {
      // Apply filters manually to get filtered data
      let filtered = [...dataSource];

      // Apply each filter
      Object.entries(filters as Record<string, any[]>).forEach(
        ([key, filterValues]) => {
          if (filterValues && filterValues.length > 0) {
            console.log(`Applying filter for ${key}:`, filterValues);
            filtered = filtered.filter((item: any) => {
              const itemValue = item[key];

              // Handle different data types
              if (typeof itemValue === "string") {
                return filterValues.some((filterValue: string) =>
                  itemValue.toLowerCase().includes(filterValue.toLowerCase())
                );
              } else if (typeof itemValue === "number") {
                return filterValues.includes(itemValue);
              } else if (itemValue === null || itemValue === undefined) {
                // Handle null/undefined values
                return (
                  filterValues.includes("None") || filterValues.includes("")
                );
              } else {
                // For other types, try to convert to string and compare
                return filterValues.some((filterValue: string) =>
                  String(itemValue)
                    .toLowerCase()
                    .includes(filterValue.toLowerCase())
                );
              }
            });
            console.log(
              `After filtering by ${key}:`,
              filtered.length,
              "items remaining"
            );
          }
        }
      );

      console.log("Final filtered data:", filtered.length, "items");
      setFilteredData(filtered);
      setIsFiltered(true);
    } else {
      console.log("No filters, clearing filtered state");
      setFilteredData([]);
      setIsFiltered(false);
    }
  };

  const issueColumns = getIssueColumns(
    favoriteItems,
    toggleFavorite,
    navigationStack,
    [],
    projectIssues,
    getWorkstreamDataCellSpan
  );

  return (
    <>
      <ProjectSummary
        projectAggregatedData={projectAggregatedData}
        projectName={projectName}
        filteredIssues={isFiltered ? filteredData : undefined}
        showFilteredMetrics={isFiltered}
      />

      <Card
        title={
          <Space>
            <InfoCircleOutlined />
            <Space>
              <span>Project Workstreams ({projectIssues.length})</span>
              {navigationStack.length === 1 && (
                <Button
                  type="primary"
                  onClick={showRequestAllModal}
                  size="small"
                >
                  Request All
                </Button>
              )}
            </Space>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">
              Last updated: {new Date().toLocaleString()}
              {isFiltered && (
                <span
                  style={{
                    marginLeft: "8px",
                    color: "#1890ff",
                    fontWeight: "500",
                  }}
                >
                  🔍 Showing {filteredData.length} filtered results
                </span>
              )}
            </Text>
            <Tooltip title="Exporting all workstreams is currently disabled.">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => {
                  // Export all workstreams with their complete hierarchy
                  exportWorkstreamToExcel(projectIssues, projectName);
                }}
                disabled
              >
                Export All Workstreams
              </Button>
            </Tooltip>
            {isFiltered && (
              <Button
                size="small"
                onClick={() => {
                  setFilteredData([]);
                  setIsFiltered(false);
                  // Note: This will clear our local filter state, but the table filters
                  // will need to be cleared manually by the user
                }}
              >
                Clear Filter View
              </Button>
            )}
          </Space>
        }
      >
        <Table
          key={`workstreams-table-${favoriteItems.size}-${navigationStack.length}-${loadedWorkstreamData.size}`}
          columns={issueColumns}
          dataSource={dataSource}
          rowKey="key"
          onChange={handleTableChange}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} workstreams`,
          }}
          onRow={(record) => ({
            onClick: () => handleWorkstreamClick(record),
            style: {
              cursor: "pointer",
              backgroundColor: "#fafafa",
            },
          })}
        />
      </Card>
    </>
  );
};
