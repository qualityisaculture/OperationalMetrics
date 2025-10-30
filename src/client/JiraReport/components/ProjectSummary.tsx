import React from "react";
import { Card, Row, Col, Statistic, Progress, Typography, Space } from "antd";
import {
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { ProjectAggregatedData, JiraIssueWithAggregated } from "../types";

const { Text } = Typography;

interface Props {
  projectAggregatedData: ProjectAggregatedData | null;
  projectName: string;
  filteredIssues?: JiraIssueWithAggregated[]; // New prop for filtered data
  showFilteredMetrics?: boolean; // Flag to show filtered vs total metrics
}

export const ProjectSummary: React.FC<Props> = ({
  projectAggregatedData,
  projectName,
  filteredIssues,
  showFilteredMetrics = false,
}) => {
  if (!projectAggregatedData) {
    return null;
  }

  // Calculate metrics based on filtered data if available
  const calculateFilteredMetrics = () => {
    if (!filteredIssues || filteredIssues.length === 0) {
      return null;
    }

    let totalOriginalEstimate = 0;
    let totalTimeSpent = 0;
    let totalTimeRemaining = 0;

    filteredIssues.forEach((issue) => {
      // Only use aggregated values - don't fall back to individual values to avoid confusion
      if (issue.aggregatedOriginalEstimate !== undefined) {
        totalOriginalEstimate += issue.aggregatedOriginalEstimate;
      }
      if (issue.aggregatedTimeSpent !== undefined) {
        totalTimeSpent += issue.aggregatedTimeSpent;
      }
      if (issue.aggregatedTimeRemaining !== undefined) {
        totalTimeRemaining += issue.aggregatedTimeRemaining;
      }
    });

    return {
      totalOriginalEstimateDays: totalOriginalEstimate,
      totalTimeSpentDays: totalTimeSpent,
      totalTimeRemainingDays: totalTimeRemaining,
      filteredCount: filteredIssues.length,
    };
  };

  const filteredMetrics = calculateFilteredMetrics();
  const isFiltered =
    showFilteredMetrics && filteredMetrics && filteredMetrics.filteredCount > 0;

  const {
    totalOriginalEstimateDays,
    totalTimeSpentDays,
    totalTimeRemainingDays,
    loadedWorkstreamCount,
    totalWorkstreamCount,
  } = projectAggregatedData;

  // Use filtered metrics if available, otherwise use total metrics
  const displayMetrics = isFiltered
    ? filteredMetrics!
    : {
        totalOriginalEstimateDays,
        totalTimeSpentDays,
        totalTimeRemainingDays,
        filteredCount: totalWorkstreamCount,
      };

  const progressPercentage =
    totalWorkstreamCount > 0
      ? Math.round((loadedWorkstreamCount / totalWorkstreamCount) * 100)
      : 0;

  const formatDays = (days: number): string => {
    if (days === 0) return "0d";
    const wholeDays = Math.floor(days);
    const remainingFraction = days % 1;
    if (remainingFraction === 0) return `${wholeDays}d`;
    // Round to 1 decimal place for better readability
    const roundedFraction = Math.round(remainingFraction * 10) / 10;
    return `${wholeDays}.${roundedFraction.toString().split(".")[1]}d`;
  };

  const getTitle = () => {
    if (isFiltered) {
      const percentage =
        totalWorkstreamCount > 0
          ? Math.round(
              (filteredMetrics!.filteredCount / totalWorkstreamCount) * 100
            )
          : 0;
      return `Project Summary: ${projectName} (Filtered: ${filteredMetrics!.filteredCount} of ${totalWorkstreamCount} - ${percentage}%)`;
    }
    return `Project Summary: ${projectName}`;
  };

  return (
    <Card
      title={
        <Space>
          <ProjectOutlined />
          <span>{getTitle()}</span>
        </Space>
      }
      style={{ marginBottom: "16px" }}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title={isFiltered ? "Filtered Workstreams" : "Workstreams Loaded"}
            value={
              isFiltered
                ? `${filteredMetrics!.filteredCount}`
                : `${loadedWorkstreamCount}/${totalWorkstreamCount}`
            }
            suffix={
              isFiltered ? null : (
                <Progress
                  type="circle"
                  percent={progressPercentage}
                  size={40}
                  format={(percent) => `${percent}%`}
                />
              )
            }
          />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={5}>
          <Statistic
            title={
              isFiltered ? "Filtered Approved Budget" : "Total Approved Budget"
            }
            value={
              loadedWorkstreamCount > 0 &&
              (displayMetrics.totalOriginalEstimateDays > 0 ||
                (isFiltered && filteredMetrics))
                ? formatDays(displayMetrics.totalOriginalEstimateDays)
                : "-"
            }
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
        <Col span={5}>
          <Statistic
            title={isFiltered ? "Filtered Time Spent" : "Total Time Spent"}
            value={
              loadedWorkstreamCount > 0 &&
              (displayMetrics.totalTimeSpentDays > 0 ||
                (isFiltered && filteredMetrics))
                ? formatDays(displayMetrics.totalTimeSpentDays)
                : "-"
            }
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={
              isFiltered ? "Filtered Budget Remaining" : "Budget Remaining"
            }
            value={
              loadedWorkstreamCount > 0 &&
              (displayMetrics.totalOriginalEstimateDays > 0 ||
                displayMetrics.totalTimeSpentDays > 0)
                ? (() => {
                    const remaining =
                      displayMetrics.totalOriginalEstimateDays -
                      displayMetrics.totalTimeSpentDays;
                    return remaining >= 0
                      ? formatDays(remaining)
                      : `-${formatDays(Math.abs(remaining))}`;
                  })()
                : "-"
            }
            prefix={<ClockCircleOutlined />}
            valueStyle={{
              color:
                displayMetrics.totalOriginalEstimateDays -
                  displayMetrics.totalTimeSpentDays <
                0
                  ? "#ff4d4f"
                  : "#722ed1",
            }}
          />
        </Col>
        <Col span={5}>
          <Statistic
            title={"Usage %"}
            value={
              loadedWorkstreamCount > 0 &&
              displayMetrics.totalOriginalEstimateDays > 0
                ? Math.round(
                    (displayMetrics.totalTimeSpentDays /
                      displayMetrics.totalOriginalEstimateDays) *
                      100
                  )
                : undefined
            }
            suffix={
              loadedWorkstreamCount > 0 &&
              displayMetrics.totalOriginalEstimateDays > 0
                ? "%"
                : undefined
            }
          />
        </Col>
        <Col span={5}>
          <Statistic
            title={isFiltered ? "Filtered ETC" : "Total ETC"}
            value={
              loadedWorkstreamCount > 0 &&
              (displayMetrics.totalTimeRemainingDays > 0 ||
                (isFiltered && filteredMetrics))
                ? formatDays(displayMetrics.totalTimeRemainingDays)
                : "-"
            }
            prefix={<ClockCircleOutlined />}
            valueStyle={{
              color:
                displayMetrics.totalTimeRemainingDays > 0
                  ? "#ff4d4f"
                  : "#52c41a",
            }}
          />
        </Col>
      </Row>

      {displayMetrics.totalOriginalEstimateDays > 0 && (
        <Row style={{ marginTop: "16px" }}>
          <Col span={24}>
            <Text type="secondary">
              {isFiltered ? "Filtered " : ""}Progress:{" "}
              {formatDays(displayMetrics.totalTimeSpentDays)} of{" "}
              {formatDays(displayMetrics.totalOriginalEstimateDays)} completed (
              {Math.round(
                (displayMetrics.totalTimeSpentDays /
                  displayMetrics.totalOriginalEstimateDays) *
                  100
              )}
              %)
            </Text>
          </Col>
        </Row>
      )}

      {isFiltered && (
        <Row style={{ marginTop: "8px" }}>
          <Col span={24}>
            <Text
              type="secondary"
              style={{ fontSize: "12px", fontStyle: "italic" }}
            >
              Showing metrics for {filteredMetrics!.filteredCount} filtered
              workstreams out of {totalWorkstreamCount} total
            </Text>
          </Col>
        </Row>
      )}
    </Card>
  );
};
