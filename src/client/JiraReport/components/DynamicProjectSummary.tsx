import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Card,
  Space,
  Typography,
  Button,
  Tooltip,
  Modal,
  Checkbox,
  Divider,
  Collapse,
  Tag,
} from "antd";
import {
  InfoCircleOutlined,
  DownloadOutlined,
  DownOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { JiraIssueWithAggregated } from "../types";
import { getIssueColumns } from "./tables/issueColumns";
import { ProjectSummary } from "./ProjectSummary";
import { ProjectAggregatedData } from "../types";
import { exportProjectWorkstreamsToExcel } from "../utils/excelExport";

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
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isWorkstreamsTableCollapsed, setIsWorkstreamsTableCollapsed] =
    useState(false);

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

  const issueColumns = useMemo(
    () =>
      getIssueColumns(
        favoriteItems,
        toggleFavorite,
        navigationStack,
        [],
        projectIssues,
        getWorkstreamDataCellSpan
      ),
    [
      favoriteItems,
      toggleFavorite,
      navigationStack,
      projectIssues,
      getWorkstreamDataCellSpan,
    ]
  );

  // Calculate summary values for numerical columns
  const summary = useMemo(() => {
    if (dataSource.length === 0) {
      return undefined;
    }

    let sumBaselineEstimate = 0;
    let sumOriginalEstimate = 0;
    let sumWorkstreamEstimate = 0;
    let sumTimeSpent = 0;
    let sumTimeRemaining = 0;

    dataSource.forEach((record: JiraIssueWithAggregated) => {
      // Baseline Estimate (only counts workstream's own value, not aggregated)
      if (record.baselineEstimate != null) {
        sumBaselineEstimate += record.baselineEstimate;
      }

      // Original Estimate (only use aggregated - leave blank if not available)
      // Only sum if we have aggregated data to avoid showing misleading values
      if (record.aggregatedOriginalEstimate !== undefined) {
        sumOriginalEstimate += record.aggregatedOriginalEstimate;
      }

      // Workstream Estimate (only the workstream's own value, not aggregated)
      if (record.originalEstimate != null) {
        sumWorkstreamEstimate += record.originalEstimate;
      }

      // Actual Days Logged (only use aggregated - leave blank if not available)
      if (record.aggregatedTimeSpent !== undefined) {
        sumTimeSpent += record.aggregatedTimeSpent;
      }

      // ETC (only use aggregated - leave blank if not available)
      if (record.aggregatedTimeRemaining !== undefined) {
        sumTimeRemaining += record.aggregatedTimeRemaining;
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
    let baselineEstimateIndex = -1;
    let originalEstimateIndex = -1;
    let workstreamEstimateIndex = -1;
    let timeSpentIndex = -1;
    let percentageBookedIndex = -1;
    let timeRemainingIndex = -1;
    let totalForecastIndex = -1;
    let varianceDaysIndex = -1;
    let variancePercentIndex = -1;

    issueColumns.forEach((col: any, index: number) => {
      const key = col.key || col.dataIndex;
      if (key === "favorite") favoriteIndex = index;
      else if (key === "key") keyIndex = index;
      else if (key === "summary") summaryIndex = index;
      else if (key === "type") typeIndex = index;
      else if (key === "status") statusIndex = index;
      else if (key === "priority") priorityIndex = index;
      else if (key === "account") accountIndex = index;
      else if (key === "baselineEstimate") baselineEstimateIndex = index;
      else if (key === "originalEstimate") originalEstimateIndex = index;
      else if (key === "workstreamEstimate") workstreamEstimateIndex = index;
      else if (key === "timeSpent") timeSpentIndex = index;
      else if (key === "percentageBooked") percentageBookedIndex = index;
      else if (key === "timeRemaining") timeRemainingIndex = index;
      else if (key === "totalForecast") totalForecastIndex = index;
      else if (key === "varianceDays") varianceDaysIndex = index;
      else if (key === "variancePercent") variancePercentIndex = index;
    });

    return (pageData: JiraIssueWithAggregated[]) => {
      const cells: React.ReactNode[] = [];
      let cellIndex = 0;

      // Favorite column
      if (favoriteIndex !== -1) {
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

      // Original Estimate (only show if we have aggregated data)
      if (originalEstimateIndex !== -1) {
        // Check if we have any aggregated data in the dataSource
        const hasAnyAggregatedData = pageData.some(
          (record: JiraIssueWithAggregated) =>
            record.aggregatedOriginalEstimate !== undefined
        );
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={originalEstimateIndex}>
            <Text strong>
              {hasAnyAggregatedData && sumOriginalEstimate > 0 ? (
                <Tag color="green">{sumOriginalEstimate.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Workstream Estimate
      if (workstreamEstimateIndex !== -1) {
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={workstreamEstimateIndex}>
            <Text strong>
              {sumWorkstreamEstimate > 0 ? (
                <Tag color="green">{sumWorkstreamEstimate.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Actual Days Logged (only show if we have aggregated data)
      if (timeSpentIndex !== -1) {
        const hasAnyAggregatedTimeSpent = pageData.some(
          (record: JiraIssueWithAggregated) =>
            record.aggregatedTimeSpent !== undefined
        );
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={timeSpentIndex}>
            <Text strong>
              {hasAnyAggregatedTimeSpent && sumTimeSpent > 0 ? (
                <Tag color="blue">{sumTimeSpent.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Percentage Booked Against Budget (only show if we have aggregated data)
      if (percentageBookedIndex !== -1) {
        const hasAnyAggregatedData = pageData.some(
          (record: JiraIssueWithAggregated) =>
            record.aggregatedOriginalEstimate !== undefined ||
            record.aggregatedTimeSpent !== undefined
        );
        const percentageBooked =
          sumOriginalEstimate > 0
            ? (sumTimeSpent / sumOriginalEstimate) * 100
            : 0;
        const percentageColor =
          percentageBooked > 100
            ? "red"
            : percentageBooked > 75
              ? "orange"
              : percentageBooked > 50
                ? "blue"
                : "green";
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={percentageBookedIndex}>
            <Text strong>
              {hasAnyAggregatedData && sumOriginalEstimate > 0 ? (
                <Tag color={percentageColor}>
                  {percentageBooked.toFixed(1)}%
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // ETC (only show if we have aggregated data)
      if (timeRemainingIndex !== -1) {
        const hasAnyAggregatedTimeRemaining = pageData.some(
          (record: JiraIssueWithAggregated) =>
            record.aggregatedTimeRemaining !== undefined
        );
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={timeRemainingIndex}>
            <Text strong>
              {hasAnyAggregatedTimeRemaining && sumTimeRemaining > 0 ? (
                <Tag color="red">{sumTimeRemaining.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Total Forecast (only show if we have aggregated data)
      if (totalForecastIndex !== -1) {
        const hasAnyAggregatedForecast = pageData.some(
          (record: JiraIssueWithAggregated) =>
            record.aggregatedTimeSpent !== undefined ||
            record.aggregatedTimeRemaining !== undefined
        );
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={totalForecastIndex}>
            <Text strong>
              {hasAnyAggregatedForecast && sumTotalForecast > 0 ? (
                <Tag color="purple">{sumTotalForecast.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          </Table.Summary.Cell>
        );
        cellIndex++;
      }

      // Variance (Days) (only show if we have aggregated data)
      if (varianceDaysIndex !== -1) {
        const hasAnyAggregatedData = pageData.some(
          (record: JiraIssueWithAggregated) =>
            record.aggregatedOriginalEstimate !== undefined ||
            record.aggregatedTimeSpent !== undefined ||
            record.aggregatedTimeRemaining !== undefined
        );
        const varianceColor =
          sumVariance > 0 ? "red" : sumVariance < 0 ? "green" : "default";
        cells.push(
          <Table.Summary.Cell key={cellIndex} index={varianceDaysIndex}>
            <Text strong>
              {hasAnyAggregatedData &&
              (sumOriginalEstimate > 0 || sumTotalForecast > 0) ? (
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

      return <Table.Summary.Row>{cells}</Table.Summary.Row>;
    };
  }, [dataSource, issueColumns]);

  // Export modal functions
  const showExportModal = () => {
    // Initialize with only chargeable accounts selected
    const chargeableAccounts = [
      ...new Set(
        projectIssues
          .map((issue) => issue.account)
          .filter((account) => account && account.includes("(Chargeable)"))
      ),
    ];
    setSelectedAccounts(chargeableAccounts);
    setIsExportModalVisible(true);
  };

  const handleExportModalCancel = () => {
    setIsExportModalVisible(false);
    setSelectedAccounts([]);
  };

  const handleExport = () => {
    // Filter workstreams by selected accounts
    const filteredWorkstreams = projectIssues.filter((issue) =>
      selectedAccounts.includes(issue.account)
    );
    exportProjectWorkstreamsToExcel(filteredWorkstreams, projectName);
    setIsExportModalVisible(false);
    setSelectedAccounts([]);
  };

  const handleAccountSelectionChange = (checkedValues: string[]) => {
    setSelectedAccounts(checkedValues);
  };

  return (
    <>
      <ProjectSummary
        projectAggregatedData={projectAggregatedData}
        projectName={projectName}
        filteredIssues={isFiltered ? filteredData : undefined}
        showFilteredMetrics={isFiltered}
      />

      <Collapse
        activeKey={isWorkstreamsTableCollapsed ? [] : ["workstreams"]}
        onChange={(keys) => setIsWorkstreamsTableCollapsed(keys.length === 0)}
        ghost
        style={{ marginBottom: "16px" }}
      >
        <Collapse.Panel
          key="workstreams"
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
                {isWorkstreamsTableCollapsed ? (
                  <RightOutlined />
                ) : (
                  <DownOutlined />
                )}
                <InfoCircleOutlined
                  style={{ marginLeft: "8px", marginRight: "8px" }}
                />
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Project Workstreams ({projectIssues.length})
                </Typography.Title>
                {navigationStack.length === 1 && (
                  <Button
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      showRequestAllModal();
                    }}
                    size="small"
                    style={{ marginLeft: "16px" }}
                  >
                    Request All
                  </Button>
                )}
              </div>
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
                <Tooltip title="Export Project Workstreams table data to Excel">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      showExportModal();
                    }}
                  >
                    Export Project Workstreams
                  </Button>
                </Tooltip>
                {isFiltered && (
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
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
            </div>
          }
          showArrow={false}
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
            summary={summary}
          />
        </Collapse.Panel>
      </Collapse>

      {/* Export Modal */}
      <Modal
        title="Export Project Workstreams"
        open={isExportModalVisible}
        onCancel={handleExportModalCancel}
        footer={[
          <Button key="cancel" onClick={handleExportModalCancel}>
            Cancel
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export to Excel
          </Button>,
        ]}
      >
        <Divider orientation="left">Select Accounts to Export</Divider>

        <Checkbox.Group
          value={selectedAccounts}
          onChange={handleAccountSelectionChange}
          style={{ width: "100%" }}
        >
          {[
            ...new Set(
              projectIssues.map((issue) => issue.account).filter(Boolean)
            ),
          ].map((account) => (
            <div key={account} style={{ marginBottom: "8px" }}>
              <Checkbox value={account}>{account}</Checkbox>
            </div>
          ))}
        </Checkbox.Group>
      </Modal>
    </>
  );
};
