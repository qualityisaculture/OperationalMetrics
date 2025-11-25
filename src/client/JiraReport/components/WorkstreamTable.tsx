import React, { useState, useMemo } from "react";
import { JiraIssueWithAggregated } from "../types";
import { UnifiedIssuesTable } from "../../components/tables/UnifiedIssuesTable";
import { TimeSpentDetailTable } from "../../components/tables/TimeSpentDetailTable";
import { EpicIssuesList } from "./EpicIssuesList";
import { Collapse, Typography, Button, Modal, Space, Alert } from "antd";
import {
  DownOutlined,
  RightOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";

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

  // Orphan Detection
  onRequestOrphanDetection?: (workstreamKey: string) => void;
  // Time Spent Detail
  requestWorkstreamWithTimeSpentDetail?: (
    workstreamKey: string
  ) => Promise<void>;
  currentIssuesLoading?: boolean;
  progressStatus?: string;
  progressDetails?: any;
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
  onRequestOrphanDetection,
  requestWorkstreamWithTimeSpentDetail,
  currentIssuesLoading,
  progressStatus,
  progressDetails,
}) => {
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [isEpicListCollapsed, setIsEpicListCollapsed] = useState(false);
  const [isTimeSpentDetailCollapsed, setIsTimeSpentDetailCollapsed] =
    useState(false);
  const [additionalMonths, setAdditionalMonths] = useState(0);
  const [isTimeSpentDetailModalVisible, setIsTimeSpentDetailModalVisible] =
    useState(false);
  const [isLoadingTimeSpentDetail, setIsLoadingTimeSpentDetail] =
    useState(false);

  const currentWorkstreamKey =
    navigationStack.length > 0
      ? navigationStack[navigationStack.length - 1].key
      : null;

  const hasTimeSpentDetail = useMemo(() => {
    // Check if any issue has timeSpentDetail data (array with length > 0)
    const hasData = currentIssues.some(
      (issue) => issue.timeSpentDetail && issue.timeSpentDetail.length > 0
    );
    return hasData;
  }, [currentIssues]);

  const isTimeSpentDetailLoaded = useMemo(() => {
    // Check if timeSpentDetail has been loaded (defined, even if empty array)
    // If undefined, it means data hasn't been requested yet
    return currentIssues.some(
      (issue) => issue.timeSpentDetail !== undefined
    );
  }, [currentIssues]);

  const handleRequestTimeSpentDetail = async () => {
    if (!currentWorkstreamKey || !requestWorkstreamWithTimeSpentDetail) {
      return;
    }

    setIsTimeSpentDetailModalVisible(true);
    setIsLoadingTimeSpentDetail(true);

    try {
      await requestWorkstreamWithTimeSpentDetail(currentWorkstreamKey);
    } catch (error) {
      console.error("Error requesting time spent detail:", error);
    } finally {
      setIsLoadingTimeSpentDetail(false);
      setIsTimeSpentDetailModalVisible(false);
    }
  };
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

  // Recursive function to find all Epic issues in the tree
  const findAllEpicIssues = (
    issues: JiraIssueWithAggregated[]
  ): JiraIssueWithAggregated[] => {
    const epicIssues: JiraIssueWithAggregated[] = [];

    for (const issue of issues) {
      // Check if current issue is an Epic in Progress
      if (issue.type === "Epic" && issue.status === "In Progress") {
        epicIssues.push(issue);
      }

      // Recursively check children
      if (issue.children && issue.children.length > 0) {
        epicIssues.push(...findAllEpicIssues(issue.children));
      }
    }

    return epicIssues;
  };

  // Find all Epic issues that are In Progress in the entire tree
  const epicIssuesInProgress = findAllEpicIssues(currentIssues);

  return (
    <div>
      <Modal
        title="Fetching Time Spent Detail"
        open={isTimeSpentDetailModalVisible}
        closable={false}
        footer={null}
        maskClosable={false}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            message="Warning"
            description={
              <div>
                <p>
                  This operation may take several minutes depending on the number
                  of issues in the workstream. Please do not close this window.
                </p>
                {currentWorkstreamKey && (
                  <p style={{ marginTop: "8px", marginBottom: 0 }}>
                    <strong>Requesting for:</strong> {currentWorkstreamKey} and
                    all child issues recursively (all levels below)
                  </p>
                )}
              </div>
            }
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
          />
          {progressStatus && (
            <div>
              <Typography.Text strong>Status: </Typography.Text>
              <Typography.Text>{progressStatus}</Typography.Text>
            </div>
          )}
          {progressDetails && (
            <div>
              <Typography.Text>
                {progressDetails.currentPhase || "Processing..."}
              </Typography.Text>
              {progressDetails.phaseProgress !== undefined &&
                progressDetails.phaseTotal !== undefined && (
                  <div style={{ marginTop: "8px" }}>
                    <Typography.Text type="secondary">
                      Progress: {progressDetails.phaseProgress} of{" "}
                      {progressDetails.phaseTotal} issues
                    </Typography.Text>
                  </div>
                )}
            </div>
          )}
        </Space>
      </Modal>

      <Collapse
        activeKey={isTableCollapsed ? [] : ["table"]}
        onChange={(keys) => setIsTableCollapsed(keys.length === 0)}
        ghost
        style={{ marginBottom: "16px" }}
      >
        <Collapse.Panel
          key="table"
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
                {isTableCollapsed ? <RightOutlined /> : <DownOutlined />}
                <Typography.Title
                  level={4}
                  style={{ margin: 0, marginLeft: "8px" }}
                >
                  Issues in {navigationStack[navigationStack.length - 1].name}
                </Typography.Title>
              </div>
            </div>
          }
          showArrow={false}
        >
          <UnifiedIssuesTable
            title=""
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
            parentWorkstreamKey={
              navigationStack[navigationStack.length - 1].key
            }
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
                backgroundColor:
                  record.childCount > 0 ? "#fafafa" : "transparent",
              },
            })}
          />
        </Collapse.Panel>
      </Collapse>

      {epicIssuesInProgress.length > 0 && (
        <Collapse
          activeKey={isEpicListCollapsed ? [] : ["epics"]}
          onChange={(keys) => setIsEpicListCollapsed(keys.length === 0)}
          ghost
        >
          <Collapse.Panel
            key="epics"
            header={
              <div style={{ display: "flex", alignItems: "center" }}>
                {isEpicListCollapsed ? <RightOutlined /> : <DownOutlined />}
                <Typography.Title
                  level={4}
                  style={{ margin: 0, marginLeft: "8px" }}
                >
                  Epic Issues In Progress ({epicIssuesInProgress.length})
                </Typography.Title>
              </div>
            }
            showArrow={false}
          >
            <EpicIssuesList epicIssues={epicIssuesInProgress} />
          </Collapse.Panel>
        </Collapse>
      )}

      <Collapse
        activeKey={isTimeSpentDetailCollapsed ? [] : ["timeSpentDetail"]}
        onChange={(keys) => setIsTimeSpentDetailCollapsed(keys.length === 0)}
        ghost
        style={{ marginTop: "16px" }}
      >
        <Collapse.Panel
          key="timeSpentDetail"
          header={
            <div style={{ display: "flex", alignItems: "center" }}>
              {isTimeSpentDetailCollapsed ? (
                <RightOutlined />
              ) : (
                <DownOutlined />
              )}
              <Typography.Title
                level={4}
                style={{ margin: 0, marginLeft: "8px" }}
              >
                Time Spent Detail
              </Typography.Title>
            </div>
          }
          showArrow={false}
        >
          {currentWorkstreamKey && (
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<ClockCircleOutlined />}
                  onClick={handleRequestTimeSpentDetail}
                  disabled={isLoadingTimeSpentDetail || currentIssuesLoading}
                  loading={isLoadingTimeSpentDetail || currentIssuesLoading}
                  title="Request time spent detail for this workstream and all child issues recursively (all levels below)"
                >
                  Request All (This Level & Below)
                </Button>
                {!isTimeSpentDetailLoaded && (
                  <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                    This will fetch time spent detail for {currentWorkstreamKey} and all
                    nested child issues
                  </Typography.Text>
                )}
              </Space>
            </div>
          )}
          {hasTimeSpentDetail && (
            <div style={{ marginBottom: 16 }}>
              <Alert
                message="Time spent detail data is available"
                type="success"
                showIcon
              />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button
                type="default"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => setAdditionalMonths((prev) => prev + 1)}
                title="Add another month in the past"
              >
                Add Month
              </Button>
              {additionalMonths > 0 && (
                <Button
                  type="default"
                  icon={<MinusOutlined />}
                  size="small"
                  onClick={() =>
                    setAdditionalMonths((prev) => Math.max(0, prev - 1))
                  }
                  title="Remove last added month"
                >
                  Remove Month
                </Button>
              )}
            </Space>
          </div>
          <div style={{ overflow: "auto" }}>
            <TimeSpentDetailTable
              dataSource={getSortedItems ? getSortedItems(currentIssues) : currentIssues}
              onRow={(record) => ({
                onClick: () => handleIssueClick(record),
                style: {
                  cursor: record.childCount > 0 ? "pointer" : "default",
                  backgroundColor:
                    record.childCount > 0 ? "#fafafa" : "transparent",
                },
              })}
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} issues`,
              }}
              additionalMonths={additionalMonths}
              onAdditionalMonthsChange={setAdditionalMonths}
            />
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};
