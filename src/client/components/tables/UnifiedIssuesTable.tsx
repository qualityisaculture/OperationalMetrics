import React, { useState } from "react";
import { Card, Space, Table, Button, Typography, Input } from "antd";
import {
  InfoCircleOutlined,
  DownloadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
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
}) => {
  const [exportLoading, setExportLoading] = useState(false);

  // State for time bookings date selector
  const [timeBookingsDate, setTimeBookingsDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });

  const columns = getUnifiedColumns({
    showFavoriteColumn,
    favoriteItems,
    toggleFavorite,
    navigationStack,
    currentIssues,
    projectIssues,
    getWorkstreamDataCellSpan,
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
              <Input
                type="date"
                value={timeBookingsDate}
                onChange={(e) => setTimeBookingsDate(e.target.value)}
                size="small"
                style={{ width: "140px" }}
                prefix={<CalendarOutlined />}
              />
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                size="small"
                onClick={() => onRequestTimeBookings(timeBookingsDate)}
              >
                Request Time Bookings
              </Button>
            </Space>
          )}
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={getSortedItems ? getSortedItems(dataSource) : dataSource}
        rowKey={rowKey}
        pagination={pagination}
        onRow={onRow}
      />
    </Card>
  );
};
