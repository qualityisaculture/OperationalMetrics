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
                    onClick={showRequestAllModal}
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
                    onClick={showExportModal}
                  >
                    Export Project Workstreams
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
