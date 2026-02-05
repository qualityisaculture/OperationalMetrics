import React, { useState, useEffect, useMemo } from "react";
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
import { BarChartOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { ProjectSummaryRow } from "../types";
import { JiraProject } from "../../../server/graphManagers/JiraReportGraphManager";

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

/** One row in the all-projects table: project + optional loaded summary data. */
export interface SummaryTableRow {
  project: JiraProject;
  projectKey: string;
  projectName: string;
  summaryData: ProjectSummaryRow | null;
}

interface Props {
  /** All projects to show in the table (key/name always; data when loaded). */
  allProjects: JiraProject[];
  projectsSummaryData: ProjectSummaryRow[] | null;
  projectsSummaryLoading: boolean;
  projectsSummaryError: string | null;
  projectsSummaryProgress?: {
    current: number;
    total: number;
    projectKey: string;
  };
  onLoadProjectsSummary: (projectKeys: string[]) => void;
  /** When a row is clicked, open project detail. */
  onProjectClick: (project: JiraProject) => void;
  /** Used to sort table (favourites first) and for Favourites column. */
  favoriteItems: Set<string>;
  /** Toggle favourite (star) for a project. */
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void;
}

export const ProjectsSummarySection: React.FC<Props> = ({
  allProjects,
  projectsSummaryData,
  projectsSummaryLoading,
  projectsSummaryError,
  projectsSummaryProgress,
  onLoadProjectsSummary,
  onProjectClick,
  favoriteItems,
  toggleFavorite,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const favoriteKeysStable = useMemo(
    () => [...favoriteItems].sort().join(","),
    [favoriteItems]
  );
  useEffect(() => {
    setSelectedKeys(new Set(favoriteItems));
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
      checked ? new Set(allProjects.map((p) => p.key)) : new Set()
    );
  };

  const handleLoad = () => onLoadProjectsSummary(Array.from(selectedKeys));

  const favoriteCount = favoriteItems.size;
  const selectedCount = selectedKeys.size;
  const allSelected =
    allProjects.length > 0 && selectedKeys.size === allProjects.length;
  const someSelected = selectedCount > 0;

  const tableData: SummaryTableRow[] = useMemo(() => {
    const sorted = [...allProjects].sort((a, b) => {
      const aFav = favoriteItems.has(a.key);
      const bFav = favoriteItems.has(b.key);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.key.localeCompare(b.key);
    });
    return sorted.map((project) => ({
      project,
      projectKey: project.key,
      projectName: project.name,
      summaryData: projectsSummaryData?.find((s) => s.projectKey === project.key) ?? null,
    }));
  }, [allProjects, favoriteItems, projectsSummaryData]);

  const columns = [
    {
      title: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={(e) => toggleAll(e.target.checked)}
        />
      ),
      key: "load",
      width: 48,
      align: "center" as const,
      render: (_: unknown, row: SummaryTableRow) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedKeys.has(row.projectKey)}
            onChange={() => toggleKey(row.projectKey)}
          />
        </span>
      ),
    },
    {
      title: "Favourites",
      key: "favorite",
      width: 80,
      align: "center" as const,
      render: (_: unknown, row: SummaryTableRow) => (
        <Button
          type="text"
          icon={
            favoriteItems.has(row.projectKey) ? (
              <StarFilled style={{ color: "#faad14" }} />
            ) : (
              <StarOutlined />
            )
          }
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(row.projectKey, e);
          }}
          style={{ padding: 0, border: "none" }}
        />
      ),
    },
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
      render: (_: unknown, row: SummaryTableRow) => {
        const d = row.summaryData?.chargeable;
        const days = d?.originalEstimate ?? 0;
        return d ? (
          days > 0 ? (
            <Tag color="blue">{formatDays(days)}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )
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
      render: (_: unknown, row: SummaryTableRow) => {
        const d = row.summaryData?.chargeable;
        const days = d?.timeSpent ?? 0;
        return d ? (
          days > 0 ? (
            <Tag color="blue">{formatDays(days)}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )
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
      render: (_: unknown, row: SummaryTableRow) => {
        const s = row.summaryData;
        if (!s || s.chargeable.originalEstimate <= 0)
          return <Text type="secondary">-</Text>;
        return (
          <Tag color={getApprovalStatusColor(s)}>
            {Math.round(s.chargeable.usagePercent)}%
          </Tag>
        );
      },
    },
    {
      title: "Approved Days Remaining",
      key: "approvedDaysRemaining",
      align: "center" as const,
      width: 150,
      render: (_: unknown, row: SummaryTableRow) => {
        const d = row.summaryData?.chargeable;
        if (!d) return <Text type="secondary">-</Text>;
        const days = Math.max(0, d.originalEstimate - d.timeSpent);
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
      render: (_: unknown, row: SummaryTableRow) => {
        const d = row.summaryData?.chargeable;
        const days = d?.timeRemaining ?? 0;
        return d ? (
          days > 0 ? (
            <Tag color="blue">{formatDays(days)}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )
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
      render: (_: unknown, row: SummaryTableRow) => {
        const s = row.summaryData;
        if (!s) return <Text type="secondary">-</Text>;
        const days =
          s.chargeable.timeSpent + (s.chargeable.timeRemaining ?? 0);
        return days > 0 ? (
          <Tag color={getApprovalStatusColor(s)}>{formatDays(days)}</Tag>
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
      render: (_: unknown, row: SummaryTableRow) => {
        const d = row.summaryData?.nonChargeable;
        const days = d?.originalEstimate ?? 0;
        return d ? (
          days > 0 ? (
            <Tag color="blue">{formatDays(days)}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )
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
      render: (_: unknown, row: SummaryTableRow) => {
        const d = row.summaryData?.nonChargeable;
        const days = d?.timeSpent ?? 0;
        return d ? (
          days > 0 ? (
            <Tag color="blue">{formatDays(days)}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )
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
      render: (_: unknown, row: SummaryTableRow) => {
        const s = row.summaryData;
        if (!s || s.nonChargeable.originalEstimate <= 0)
          return <Text type="secondary">-</Text>;
        return (
          <Tag color={getUsagePercentStatusColor(s.nonChargeable.usagePercent)}>
            {Math.round(s.nonChargeable.usagePercent)}%
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      style={{ marginBottom: "24px" }}
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
      {favoriteCount === 0 && (
        <Alert
          message="No favourite projects yet"
          description="Use the star in the Favourites column to mark projects. By default, favourites are selected for loading; use the first column to choose which projects to load, then click 'Load Projects Summary'."
          type="info"
          showIcon
          style={{ marginBottom: "16px" }}
        />
      )}

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

      {tableData.length > 0 && (
        <Table<SummaryTableRow>
          dataSource={tableData}
          columns={columns}
          rowKey="projectKey"
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} projects` }}
          size="small"
          scroll={{ x: "max-content" }}
          onRow={(record) => ({
            onClick: () => onProjectClick(record.project),
            style: { cursor: "pointer" },
          })}
        />
      )}
    </Card>
  );
};
