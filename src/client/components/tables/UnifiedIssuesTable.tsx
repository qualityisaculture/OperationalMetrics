import React, { useState, useMemo } from "react";
import { Card, Space, Table, Button, Typography, DatePicker, Tag } from "antd";
import {
  InfoCircleOutlined,
  DownloadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { getUnifiedColumns } from "./columns";
import { JiraIssueWithAggregated } from "../../JiraReport/types";
import {
  exportIssuesToExcel,
  exportCompleteWorkstreamToExcel,
} from "../../JiraReport/utils/excelExport";
import { useResizableColumns, ResizableTitle } from "./index";

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

  // Time Bookings
  onRequestTimeBookings?: (fromDate: string) => void;
  timeDataLoaded?: Set<string>;
  currentWorkstreamKey?: string;
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
  onRequestTimeBookings,
  timeDataLoaded = new Set(),
  currentWorkstreamKey,
}) => {
  const [exportLoading, setExportLoading] = useState(false);

  // State for time bookings date selector
  const [timeBookingsDate, setTimeBookingsDate] = useState<Dayjs>(() => {
    return dayjs().subtract(30, "day");
  });

  // Force re-render when date changes to update the "Actual Days since Date" column
  const [dateKey, setDateKey] = useState(0);

  // Get base columns
  const baseColumns = getUnifiedColumns({
    showFavoriteColumn,
    favoriteItems,
    toggleFavorite,
    navigationStack,
    currentIssues,
    projectIssues,
    getWorkstreamDataCellSpan,
    timeBookingsDate: timeBookingsDate.format("YYYY-MM-DD"),
  });

  // Use resizable columns hook
  const { getResizableColumns } = useResizableColumns(baseColumns);

  // Get resizable columns
  const columns = useMemo(
    () => getResizableColumns(baseColumns),
    [getResizableColumns, baseColumns]
  );

  // Calculate summary values for numerical columns
  const summary = useMemo(() => {
    if (!getWorkstreamDataCellSpan || dataSource.length === 0) {
      return null;
    }

    const displayData = getSortedItems
      ? getSortedItems(dataSource)
      : dataSource;
    let sumBaselineEstimate = 0;
    let sumOriginalEstimate = 0;
    let sumTimeSpent = 0;
    let sumTimeRemaining = 0;
    let sumActualDaysSinceDate = 0;

    displayData.forEach((record: JiraIssueWithAggregated) => {
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

      // Actual Days Logged since Date (if timeBookingsDate is set)
      if (timeBookingsDate) {
        let totalTimeLogged = 0;
        const dateString = timeBookingsDate.format("YYYY-MM-DD");
        if (record.timeDataByKey) {
          try {
            Object.values(record.timeDataByKey).forEach((timeDataArray) => {
              if (Array.isArray(timeDataArray)) {
                timeDataArray.forEach((timeEntry) => {
                  if (
                    timeEntry &&
                    timeEntry.date &&
                    timeEntry.timeSpent &&
                    timeEntry.date >= dateString
                  ) {
                    totalTimeLogged += timeEntry.timeSpent;
                  }
                });
              }
            });
          } catch (error) {
            console.warn("Error processing timeDataByKey:", error);
          }
        } else if (record.timeBookings) {
          try {
            record.timeBookings.forEach((timeEntry) => {
              if (
                timeEntry &&
                timeEntry.date &&
                timeEntry.timeSpent &&
                timeEntry.date >= dateString
              ) {
                totalTimeLogged += timeEntry.timeSpent;
              }
            });
          } catch (error) {
            console.warn("Error processing timeBookings:", error);
          }
        }
        sumActualDaysSinceDate += totalTimeLogged;
      }
    });

    const sumTotalForecast = sumTimeSpent + sumTimeRemaining;
    const sumVariance = sumTotalForecast - sumOriginalEstimate;

    // Find column indices dynamically
    let favoriteIndex = -1;
    let keyIndex = -1;
    let summaryIndex = -1;
    let typeIndex = -1;
    let statusIndex = -1;
    let priorityIndex = -1;
    let accountIndex = -1;
    let childrenIndex = -1;
    let baselineEstimateIndex = -1;
    let originalEstimateIndex = -1;
    let timeSpentIndex = -1;
    let timeRemainingIndex = -1;
    let totalForecastIndex = -1;
    let varianceDaysIndex = -1;
    let variancePercentIndex = -1;
    let actualDaysSinceDateIndex = -1;

    columns.forEach((col: any, index: number) => {
      const key = col.key || col.dataIndex;
      if (key === "favorite") favoriteIndex = index;
      else if (key === "key") keyIndex = index;
      else if (key === "summary") summaryIndex = index;
      else if (key === "type") typeIndex = index;
      else if (key === "status") statusIndex = index;
      else if (key === "priority") priorityIndex = index;
      else if (key === "account") accountIndex = index;
      else if (key === "children") childrenIndex = index;
      else if (key === "baselineEstimate") baselineEstimateIndex = index;
      else if (key === "originalEstimate") originalEstimateIndex = index;
      else if (key === "timeSpent") timeSpentIndex = index;
      else if (key === "timeRemaining") timeRemainingIndex = index;
      else if (key === "totalForecast") totalForecastIndex = index;
      else if (key === "varianceDays") varianceDaysIndex = index;
      else if (key === "variancePercent") variancePercentIndex = index;
      else if (key === "actualDaysLogged") actualDaysSinceDateIndex = index;
    });

    return (pageData: JiraIssueWithAggregated[]) => {
      const cells: React.ReactNode[] = [];
      let cellIndex = 0;

      // Favorite column
      if (showFavoriteColumn && favoriteIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={favoriteIndex} />
        );
        cellIndex++;
      }

      // Issue Key
      if (keyIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={keyIndex}>
            <Text strong>Total</Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Summary
      if (summaryIndex !== -1) {
        cells.push(<Table.Summary.Cell key={cellIndex} index={summaryIndex} />);
        cellIndex++;
      }

      // Issue Type
      if (typeIndex !== -1) {
        cells.push(<Table.Summary.Cell key={cellIndex} index={typeIndex} />);
        cellIndex++;
      }

      // Status
      if (statusIndex !== -1) {
        cells.push(<Table.Summary.Cell key={cellIndex} index={statusIndex} />);
        cellIndex++;
      }

      // Priority
      if (priorityIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={priorityIndex} />
        );
        cellIndex++;
      }

      // Account
      if (accountIndex !== -1) {
        cells.push(<Table.Summary.Cell key={cellIndex} index={accountIndex} />);
        cellIndex++;
      }

      // Children
      if (childrenIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={childrenIndex} />
        );
        cellIndex++;
      }

      // Baseline Estimate
      if (baselineEstimateIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={baselineEstimateIndex}>
            <Text strong>
              {sumBaselineEstimate > 0 ? (
                <Tag color="orange">{sumBaselineEstimate.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Original Estimate
      if (originalEstimateIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={originalEstimateIndex}>
            <Text strong>
              {sumOriginalEstimate > 0 ? (
                <Tag color="green">{sumOriginalEstimate.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Actual Days Logged
      if (timeSpentIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={timeSpentIndex}>
            <Text strong>
              {sumTimeSpent > 0 ? (
                <Tag color="blue">{sumTimeSpent.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // ETC
      if (timeRemainingIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={timeRemainingIndex}>
            <Text strong>
              {sumTimeRemaining > 0 ? (
                <Tag color="red">{sumTimeRemaining.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Total Forecast
      if (totalForecastIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={totalForecastIndex}>
            <Text strong>
              {sumTotalForecast > 0 ? (
                <Tag color="purple">{sumTotalForecast.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Variance (Days)
      if (varianceDaysIndex !== -1) {
        const varianceColor =
          sumVariance > 0 ? "red" : sumVariance < 0 ? "green" : "default";
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={varianceDaysIndex}>
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
        cellIndex++;
      }

      // Variance (%) - skipped in summary as percentage variance of sums doesn't have correct meaning
      if (variancePercentIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={variancePercentIndex} />
        );
        cellIndex++;
      }

      // Actual Days Logged since Date
      if (actualDaysSinceDateIndex !== -1 && timeBookingsDate) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={actualDaysSinceDateIndex}>
            <Text strong>
              {sumActualDaysSinceDate > 0 ? (
                <Tag color="blue">{sumActualDaysSinceDate.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      return <Table.Summary.Row>{cells}</Table.Summary.Row>;
    };
  }, [
    getWorkstreamDataCellSpan,
    dataSource,
    getSortedItems,
    columns,
    showFavoriteColumn,
    timeBookingsDate,
  ]);

  const handleDateChange = (newDate: Dayjs | null) => {
    if (newDate) {
      setTimeBookingsDate(newDate);
      setDateKey((prev) => prev + 1); // Force re-render
    }
  };

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

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          {title}
        </Space>
      }
      extra={
        <Space>
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

          {onRequestTimeBookings && (
            <Space>
              {timeDataLoaded &&
                currentWorkstreamKey &&
                timeDataLoaded.has(currentWorkstreamKey) && (
                  <DatePicker
                    value={timeBookingsDate}
                    onChange={handleDateChange}
                    size="small"
                    style={{ width: "140px" }}
                    format="YYYY-MM-DD"
                  />
                )}
              {(!timeDataLoaded ||
                !currentWorkstreamKey ||
                !timeDataLoaded.has(currentWorkstreamKey)) && (
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  size="small"
                  onClick={() =>
                    onRequestTimeBookings(timeBookingsDate.format("YYYY-MM-DD"))
                  }
                >
                  Filter Actual Days by Date
                </Button>
              )}
            </Space>
          )}
        </Space>
      }
      bodyStyle={{ padding: 0, overflow: "hidden" }}
    >
      <div style={{ overflow: "auto" }}>
        <Table
          key={dateKey} // Force re-render when date changes
          columns={columns}
          dataSource={getSortedItems ? getSortedItems(dataSource) : dataSource}
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
  );
};
