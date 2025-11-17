import React, { useState, useMemo } from "react";
import { Card, Space, Table, Button, Typography, Tag } from "antd";
import { InfoCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { getUnifiedColumns } from "./columns";
import { JiraIssueWithAggregated } from "../../JiraReport/types";
import {
  exportIssuesToExcel,
  exportCompleteWorkstreamToExcel,
} from "../../JiraReport/utils/excelExport";
import { processIssuesForAnt } from "../../JiraReport/utils/dataProcessing";
import { useResizableColumns, ResizableTitle } from "./index";
import { ColumnConfig } from "../ColumnConfig";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

export interface UnifiedIssuesTableProps {
  title: string;
  dataSource: any[];
  rowKey: string;
  showFavoriteColumn?: boolean;
  getSortedItems?: <T extends { key: string }>(items: T[]) => T[];
  pagination?: any;
  onRow?: (record: any) => any;
  favoriteItems?: Set<string>;
  toggleFavorite?: (itemKey: string, event: React.MouseEvent) => void;
  navigationStack?: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  currentIssues?: JiraIssueWithAggregated[];
  projectIssues?: JiraIssueWithAggregated[];
  getWorkstreamDataCellSpan?: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };

  // Excel Export
  showExportButton?: boolean;
  workstreamName?: string;
  parentWorkstreamKey?: string;
  // New prop for complete hierarchical data
  completeHierarchicalData?: any[];
}

export const UnifiedIssuesTable: React.FC<UnifiedIssuesTableProps> = ({
  title,
  dataSource,
  rowKey,
  showFavoriteColumn = false,
  getSortedItems,
  pagination = {},
  onRow,
  favoriteItems,
  toggleFavorite,
  navigationStack,
  currentIssues,
  projectIssues,
  getWorkstreamDataCellSpan,
  showExportButton = false,
  workstreamName,
  parentWorkstreamKey,
  completeHierarchicalData,
}) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [configuredColumns, setConfiguredColumns] = useState<
    ColumnsType<JiraIssueWithAggregated>
  >([]);

  // Get base columns
  const baseColumns = useMemo(
    () =>
      getUnifiedColumns({
        showFavoriteColumn,
        favoriteItems,
        toggleFavorite,
        navigationStack,
        currentIssues,
        projectIssues,
        getWorkstreamDataCellSpan,
      }),
    [
      showFavoriteColumn,
      favoriteItems,
      toggleFavorite,
      navigationStack,
      currentIssues,
      projectIssues,
      getWorkstreamDataCellSpan,
    ]
  );

  // Use resizable columns hook
  const { getResizableColumns } = useResizableColumns(baseColumns);

  // Get resizable columns from base
  const resizableColumns = useMemo(
    () => getResizableColumns(baseColumns),
    [getResizableColumns, baseColumns]
  );

  // Apply resizing to configured columns if available, otherwise use resizable columns
  const columns = useMemo(() => {
    if (configuredColumns.length > 0) {
      // Apply resizing to configured columns
      return getResizableColumns(configuredColumns);
    }
    return resizableColumns;
  }, [configuredColumns, resizableColumns, getResizableColumns]);

  // Calculate summary values for numerical columns
  const summary = useMemo(() => {
    if (!getWorkstreamDataCellSpan || dataSource.length === 0) {
      return null;
    }

    return (pageData: JiraIssueWithAggregated[]) => {
      // Calculate sums from filtered pageData instead of entire dataSource
      let sumBaselineEstimate = 0;
      let sumOriginalEstimate = 0;
      let sumTimeSpent = 0;
      let sumTimeRemaining = 0;

      pageData.forEach((record: JiraIssueWithAggregated) => {
        // Baseline Estimate (only counts workstream's own value, not aggregated)
        if (record.baselineEstimate != null) {
          sumBaselineEstimate += record.baselineEstimate;
        }

        // Original Estimate (use aggregated if available)
        const originalEstimate =
          record.aggregatedOriginalEstimate !== undefined
            ? record.aggregatedOriginalEstimate
            : record.originalEstimate || 0;
        sumOriginalEstimate += originalEstimate;

        // Actual Days Logged (use aggregated if available)
        const timeSpent =
          record.aggregatedTimeSpent !== undefined
            ? record.aggregatedTimeSpent
            : record.timeSpent || 0;
        sumTimeSpent += timeSpent;

        // ETC (use aggregated if available)
        const timeRemaining =
          record.aggregatedTimeRemaining !== undefined
            ? record.aggregatedTimeRemaining
            : record.timeRemaining || 0;
        sumTimeRemaining += timeRemaining;
      });

      const sumTotalForecast = sumTimeSpent + sumTimeRemaining;
      const sumVariance = sumTotalForecast - sumOriginalEstimate;

      // Build cells in the same order as columns
      const cells: React.ReactNode[] = [];

      columns.forEach((col: any, index: number) => {
        const key = col.key || col.dataIndex;

        if (key === "favorite") {
          // Always add cell if favorite column exists (even if showFavoriteColumn is false, it might be in the columns array)
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index} />
          );
        } else if (key === "key") {
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>Total</Text>
            </Table.Summary.Cell>
          );
        } else if (
          key === "summary" ||
          key === "type" ||
          key === "status" ||
          key === "priority" ||
          key === "account" ||
          key === "children"
        ) {
          // Empty cells for non-numerical columns
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index} />
          );
        } else if (key === "baselineEstimate") {
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumBaselineEstimate > 0 ? (
                  <Tag color="orange">
                    {sumBaselineEstimate.toFixed(1)} days
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "originalEstimate") {
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumOriginalEstimate > 0 ? (
                  <Tag color="green">{sumOriginalEstimate.toFixed(1)} days</Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "timeSpent") {
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumTimeSpent > 0 ? (
                  <Tag color="blue">{sumTimeSpent.toFixed(1)} days</Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "timeRemaining") {
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumTimeRemaining > 0 ? (
                  <Tag color="red">{sumTimeRemaining.toFixed(1)} days</Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "totalForecast") {
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumTotalForecast > 0 ? (
                  <Tag color="purple">{sumTotalForecast.toFixed(1)} days</Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "varianceDays") {
          const varianceColor =
            sumVariance > 0 ? "red" : sumVariance < 0 ? "green" : "default";
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumOriginalEstimate > 0 || sumTotalForecast > 0 ? (
                  <Tag color={varianceColor}>
                    {sumVariance > 0 ? "+" : ""}
                    {sumVariance.toFixed(1)} days
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "variancePercent") {
          const variancePercent =
            sumOriginalEstimate > 0
              ? ((sumTotalForecast - sumOriginalEstimate) /
                  sumOriginalEstimate) *
                100
              : 0;
          const variancePercentColor =
            variancePercent > 0
              ? "red"
              : variancePercent < 0
                ? "green"
                : "default";
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index}>
              <Text strong>
                {sumOriginalEstimate > 0 ? (
                  <Tag color={variancePercentColor}>
                    {variancePercent > 0 ? "+" : ""}
                    {variancePercent.toFixed(1)}%
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
          );
        } else if (key === "actualDaysLogged") {
          // Empty cell for actualDaysLogged column
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index} />
          );
        } else {
          // Empty cell for any other columns
          cells.push(
            <Table.Summary.Cell key={`summary-${index}`} index={index} />
          );
        }
      });

      return <Table.Summary.Row>{cells}</Table.Summary.Row>;
    };
  }, [
    getWorkstreamDataCellSpan,
    dataSource,
    getSortedItems,
    columns,
    showFavoriteColumn,
  ]);

  const handleExport = async () => {
    if (!parentWorkstreamKey || !workstreamName) return;

    setExportLoading(true);
    try {
      await exportCompleteWorkstreamToExcel(
        parentWorkstreamKey,
        workstreamName
      );
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExportLoading(false);
    }
  };

  // Process data for Ant Design: replace empty children arrays with null
  // This is done at the last possible point, just before rendering
  const processedDataSource = useMemo(() => {
    const sortedData = getSortedItems ? getSortedItems(dataSource) : dataSource;
    return processIssuesForAnt(sortedData);
  }, [dataSource, getSortedItems]);

  return (
    <>
      <Card
        title={
          <Space>
            <InfoCircleOutlined />
            {title}
          </Space>
        }
        extra={
          <Space>
            <ColumnConfig
              columns={baseColumns}
              storageKey="workstream-table-columns"
              onColumnsChange={setConfiguredColumns}
            />
            <Text type="secondary">
              Last updated: {new Date().toLocaleString()}
            </Text>
            {showExportButton && workstreamName && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                loading={exportLoading}
                onClick={handleExport}
              >
                Export to Excel
              </Button>
            )}
          </Space>
        }
        bodyStyle={{ padding: 0, overflow: "hidden" }}
      >
        <div style={{ overflow: "auto" }}>
          <Table
            columns={columns}
            dataSource={processedDataSource}
            rowKey={rowKey}
            pagination={pagination}
            onRow={onRow}
            scroll={{ x: "max-content" }}
            style={{ overflow: "auto" }}
            components={{
              header: {
                cell: ResizableTitle,
              },
            }}
            summary={summary || undefined}
          />
        </div>
      </Card>
    </>
  );
};
