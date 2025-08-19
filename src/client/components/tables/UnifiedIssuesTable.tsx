import React, { useState } from "react";
import { Card, Space, Table, Button, Typography, DatePicker } from "antd";
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
  timeDataLoaded?: boolean;
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
  timeDataLoaded = false,
}) => {
  const [exportLoading, setExportLoading] = useState(false);

  // State for time bookings date selector
  const [timeBookingsDate, setTimeBookingsDate] = useState<Dayjs>(() => {
    return dayjs().subtract(30, "day");
  });

  // Force re-render when date changes to update the "Actual Days since Date" column
  const [dateKey, setDateKey] = useState(0);

  const handleDateChange = (newDate: Dayjs | null) => {
    if (newDate) {
      setTimeBookingsDate(newDate);
      setDateKey((prev) => prev + 1); // Force re-render
    }
  };

  const columns = getUnifiedColumns({
    showFavoriteColumn,
    favoriteItems,
    toggleFavorite,
    navigationStack,
    currentIssues,
    projectIssues,
    getWorkstreamDataCellSpan,
    timeBookingsDate: timeBookingsDate.format("YYYY-MM-DD"),
  });

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
              {timeDataLoaded && (
                <DatePicker
                  value={timeBookingsDate}
                  onChange={handleDateChange}
                  size="small"
                  style={{ width: "140px" }}
                  format="YYYY-MM-DD"
                />
              )}
              {!timeDataLoaded && (
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
    >
      <Table
        key={dateKey} // Force re-render when date changes
        columns={columns}
        dataSource={getSortedItems ? getSortedItems(dataSource) : dataSource}
        rowKey={rowKey}
        pagination={pagination}
        onRow={onRow}
      />
    </Card>
  );
};
