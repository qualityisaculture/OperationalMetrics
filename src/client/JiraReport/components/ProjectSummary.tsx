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
      // Use aggregated values if available, otherwise fall back to individual values
      const originalEstimate =
        issue.aggregatedOriginalEstimate ?? issue.originalEstimate ?? 0;
      const timeSpent = issue.aggregatedTimeSpent ?? issue.timeSpent ?? 0;
      const timeRemaining =
        issue.aggregatedTimeRemaining ?? issue.timeRemaining ?? 0;

      totalOriginalEstimate += originalEstimate || 0;
      totalTimeSpent += timeSpent || 0;
      totalTimeRemaining += timeRemaining || 0;
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
        <Col span={6}>
          <Statistic
            title={
              isFiltered
                ? "Filtered Original Estimate"
                : "Total Original Estimate"
            }
            value={formatDays(displayMetrics.totalOriginalEstimateDays)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={isFiltered ? "Filtered Time Spent" : "Total Time Spent"}
            value={formatDays(displayMetrics.totalTimeSpentDays)}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={
              isFiltered ? "Filtered Time Remaining" : "Total Time Remaining"
            }
            value={formatDays(displayMetrics.totalTimeRemainingDays)}
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
