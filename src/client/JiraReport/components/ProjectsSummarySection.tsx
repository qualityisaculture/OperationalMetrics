import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Progress,
  Checkbox,
  Tag,
} from "antd";
import { BarChartOutlined, StarFilled } from "@ant-design/icons";
import { ProjectSummaryRow } from "../types";

const { Text } = Typography;

function formatDays(days: number): string {
  if (days === 0) return "0d";
  const rounded = Math.round(days * 10) / 10;
  const whole = Math.floor(rounded);
  const frac = rounded % 1;
  if (Math.abs(frac) < 0.01) return `${whole}d`;
  return `${whole}.${frac.toFixed(1).split(".")[1]}d`;
}

/** Green: <80% of approved. Amber: 80–100%. Red: >100%. Used for CHG Usage % and "Time Spent + CHG ETC Days". */
function getApprovalStatusColor(row: ProjectSummaryRow): "green" | "orange" | "red" | "default" {
  const approved = row.chargeable.originalEstimate;
  if (approved <= 0) return "default";
  const timeSpentPlusETC =
    row.chargeable.timeSpent + (row.chargeable.timeRemaining ?? 0);
  const ratio = timeSpentPlusETC / approved;
  if (ratio > 1) return "red";
  if (ratio > 0.8) return "orange";
  return "green";
}

/** Green: <80%. Orange: 80–100%. Red: >100%. Used for NON-CHG Usage %. */
function getUsagePercentStatusColor(usagePercent: number): "green" | "orange" | "red" | "default" {
  if (usagePercent > 100) return "red";
  if (usagePercent > 80) return "orange";
  if (usagePercent >= 0) return "green";
  return "default";
}

export interface FavoriteProjectItem {
  key: string;
  name: string;
}

interface Props {
  favoriteProjects: FavoriteProjectItem[];
  projectsSummaryData: ProjectSummaryRow[] | null;
  projectsSummaryLoading: boolean;
  projectsSummaryError: string | null;
  projectsSummaryProgress?: {
    current: number;
    total: number;
    projectKey: string;
  };
  onLoadProjectsSummary: (projectKeys: string[]) => void;
}

export const ProjectsSummarySection: React.FC<Props> = ({
  favoriteProjects,
  projectsSummaryData,
  projectsSummaryLoading,
  projectsSummaryError,
  projectsSummaryProgress,
  onLoadProjectsSummary,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const favoriteKeysStable = favoriteProjects
    .map((p) => p.key)
    .sort()
    .join(",");
  useEffect(() => {
    setSelectedKeys(new Set(favoriteProjects.map((p) => p.key)));
  }, [favoriteKeysStable]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedKeys(
      checked ? new Set(favoriteProjects.map((p) => p.key)) : new Set()
    );
  };

  const handleLoad = () => onLoadProjectsSummary(Array.from(selectedKeys));

  const favoriteCount = favoriteProjects.length;
  const selectedCount = selectedKeys.size;
  const allSelected =
    favoriteCount > 0 && selectedCount === favoriteCount;
  const someSelected = selectedCount > 0;
  const columns = [
    {
      title: "Project Key",
      dataIndex: "projectKey",
      key: "projectKey",
      width: 120,
      align: "center" as const,
      render: (key: string) => <Tag color="blue">{key}</Tag>,
    },
    {
      title: "Project Name",
      dataIndex: "projectName",
      key: "projectName",
      ellipsis: true,
      align: "center" as const,
      render: (name: string) => <span style={{ textAlign: "center" }}>{name || "-"}</span>,
    },
    {
      title: "CHG Approved Days",
      key: "chargeableOriginalEstimate",
      align: "center" as const,
      width: 130,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days = row.chargeable.originalEstimate;
        return days > 0 ? (
          <Tag color="blue">{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "CHG Time Spent",
      key: "chargeableTimeSpent",
      align: "center" as const,
      width: 120,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days = row.chargeable.timeSpent;
        return days > 0 ? (
          <Tag color="blue">{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "CHG Usage %",
      key: "chargeableUsage",
      align: "center" as const,
      width: 100,
      render: (_: unknown, row: ProjectSummaryRow) =>
        row.chargeable.originalEstimate > 0 ? (
          <Tag color={getApprovalStatusColor(row)}>
            {Math.round(row.chargeable.usagePercent)}%
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Approved Days Remaining",
      key: "approvedDaysRemaining",
      align: "center" as const,
      width: 150,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days = Math.max(
          0,
          row.chargeable.originalEstimate - row.chargeable.timeSpent
        );
        return days > 0 ? (
          <Tag color="blue">{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "CHG ETC",
      key: "chargeableETC",
      align: "center" as const,
      width: 90,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days = row.chargeable.timeRemaining ?? 0;
        return days > 0 ? (
          <Tag color="blue">{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "Time Spent + CHG ETC Days",
      key: "timeSpentPlusETC",
      align: "center" as const,
      width: 170,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days =
          row.chargeable.timeSpent + (row.chargeable.timeRemaining ?? 0);
        const statusColor = getApprovalStatusColor(row);
        return days > 0 ? (
          <Tag color={statusColor}>{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "NON-CHG Approved Days",
      key: "nonChargeableOriginalEstimate",
      align: "center" as const,
      width: 150,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days = row.nonChargeable.originalEstimate;
        return days > 0 ? (
          <Tag color="blue">{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "NON-CHG Time Spent",
      key: "nonChargeableTimeSpent",
      align: "center" as const,
      width: 150,
      render: (_: unknown, row: ProjectSummaryRow) => {
        const days = row.nonChargeable.timeSpent;
        return days > 0 ? (
          <Tag color="blue">{formatDays(days)}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "NON-CHG Usage %",
      key: "nonChargeableUsage",
      align: "center" as const,
      width: 120,
      render: (_: unknown, row: ProjectSummaryRow) =>
        row.nonChargeable.originalEstimate > 0 ? (
          <Tag color={getUsagePercentStatusColor(row.nonChargeable.usagePercent)}>
            {Math.round(row.nonChargeable.usagePercent)}%
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  return (
    <Card
      style={{ marginTop: "24px" }}
      title={
        <Space>
          <BarChartOutlined />
          <span>Projects Summary</span>
          {favoriteCount > 0 && (
            <Text type="secondary">
              <StarFilled style={{ color: "#faad14", marginRight: "4px" }} />
              {favoriteCount} favourite{favoriteCount !== 1 ? "s" : ""}
            </Text>
          )}
        </Space>
      }
    >
      {favoriteCount === 0 ? (
        <Alert
          message="No favourite projects"
          description="Star one or more projects above, then click 'Load Projects Summary' to see chargeable and non-chargeable totals in one table."
          type="info"
          showIcon
        />
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ marginBottom: "8px" }}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
              >
                <Text strong>Select all</Text>
              </Checkbox>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 12px 0",
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                padding: "8px",
              }}
            >
              {favoriteProjects.map((p) => (
                <li
                  key={p.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 0",
                  }}
                >
                  <Checkbox
                    checked={selectedKeys.has(p.key)}
                    onChange={() => toggleKey(p.key)}
                  />
                  <Text code>{p.key}</Text>
                  <Text type="secondary" ellipsis>
                    {p.name}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <Space>
              <Button
                type="primary"
                icon={<BarChartOutlined />}
                onClick={handleLoad}
                loading={projectsSummaryLoading}
                disabled={projectsSummaryLoading || !someSelected}
              >
                Load Projects Summary
                {someSelected && ` (${selectedCount} selected)`}
              </Button>
              {projectsSummaryLoading && projectsSummaryProgress && (
                <Text type="secondary">
                  Loading project {projectsSummaryProgress.current} of{" "}
                  {projectsSummaryProgress.total}:{" "}
                  {projectsSummaryProgress.projectKey}
                </Text>
              )}
            </Space>
          </div>

          {projectsSummaryLoading && projectsSummaryProgress && (
            <Progress
              percent={
                projectsSummaryProgress.total > 0
                  ? Math.round(
                      (projectsSummaryProgress.current /
                        projectsSummaryProgress.total) *
                        100
                    )
                  : 0
              }
              status="active"
              style={{ marginBottom: "16px" }}
            />
          )}

          {projectsSummaryError && (
            <Alert
              message="Error"
              description={projectsSummaryError}
              type="error"
              showIcon
              style={{ marginBottom: "16px" }}
            />
          )}

          {projectsSummaryData && projectsSummaryData.length > 0 && (
            <Table
              dataSource={projectsSummaryData}
              columns={columns}
              rowKey="projectKey"
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
            />
          )}

          {projectsSummaryData && projectsSummaryData.length === 0 && (
            <Alert
              message="No data"
              description="Summary completed but no project data was returned. Try loading again."
              type="warning"
              showIcon
            />
          )}
        </>
      )}
    </Card>
  );
};
