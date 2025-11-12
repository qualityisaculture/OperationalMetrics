import React, { useState, useMemo, useCallback } from "react";
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
import { ColumnConfig } from "../ColumnConfig";
import type { ColumnsType } from "antd/es/table";
import { TimeBookingsModal } from "./TimeBookingsModal";

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
  const [configuredColumns, setConfiguredColumns] = useState<
    ColumnsType<JiraIssueWithAggregated>
  >([]);

  // State for time bookings date selector
  const [timeBookingsDate, setTimeBookingsDate] = useState<Dayjs>(() => {
    return dayjs().subtract(30, "day");
  });

  // Force re-render when date changes to update the "Actual Days since Date" column
  const [dateKey, setDateKey] = useState(0);

  // State for time bookings modal
  const [timeBookingsModalVisible, setTimeBookingsModalVisible] = useState(false);
  const [selectedRecordForModal, setSelectedRecordForModal] =
    useState<JiraIssueWithAggregated | null>(null);

  // Handler for opening time bookings modal
  const handleTimeBookingsClick = useCallback(
    (record: JiraIssueWithAggregated) => {
      setSelectedRecordForModal(record);
      setTimeBookingsModalVisible(true);
    },
    []
  );

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
        timeBookingsDate: timeBookingsDate.format("YYYY-MM-DD"),
        onTimeBookingsClick: handleTimeBookingsClick,
      }),
    [
      showFavoriteColumn,
      favoriteItems,
      toggleFavorite,
      navigationStack,
      currentIssues,
      projectIssues,
      getWorkstreamDataCellSpan,
      timeBookingsDate,
      handleTimeBookingsClick,
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
      let sumActualDaysSinceDate = 0;

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
                  <Tag color="orange">{sumBaselineEstimate.toFixed(1)} days</Tag>
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
              ? ((sumTotalForecast - sumOriginalEstimate) / sumOriginalEstimate) * 100
              : 0;
          const variancePercentColor =
            variancePercent > 0 ? "red" : variancePercent < 0 ? "green" : "default";
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
          if (timeBookingsDate) {
            cells.push(
              <Table.Summary.Cell key={`summary-${index}`} index={index}>
                <Text strong>
                  {sumActualDaysSinceDate > 0 ? (
                    <Tag color="blue">{sumActualDaysSinceDate.toFixed(1)} days</Tag>
                  ) : (
                    <Text type="secondary">0.0 days</Text>
                  )}
                </Text>
              </Table.Summary.Cell>
            );
          } else {
            cells.push(
              <Table.Summary.Cell key={`summary-${index}`} index={index} />
            );
          }
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
      <TimeBookingsModal
        visible={timeBookingsModalVisible}
        onClose={() => {
          setTimeBookingsModalVisible(false);
          setSelectedRecordForModal(null);
        }}
        record={selectedRecordForModal}
        filterDate={timeBookingsDate.format("YYYY-MM-DD")}
      />
    </Card>
  );
};
