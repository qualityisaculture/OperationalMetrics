import React from "react";
import { Card, Row, Col, Statistic, Progress, Typography, Space } from "antd";
import {
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { ProjectAggregatedData } from "../types";

const { Text } = Typography;

interface Props {
  projectAggregatedData: ProjectAggregatedData | null;
  projectName: string;
}

export const ProjectSummary: React.FC<Props> = ({
  projectAggregatedData,
  projectName,
}) => {
  if (!projectAggregatedData) {
    return null;
  }

  const {
    totalOriginalEstimateDays,
    totalTimeSpentDays,
    totalTimeRemainingDays,
    loadedWorkstreamCount,
    totalWorkstreamCount,
  } = projectAggregatedData;

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

  return (
    <Card
      title={
        <Space>
          <ProjectOutlined />
          <span>Project Summary: {projectName}</span>
        </Space>
      }
      style={{ marginBottom: "16px" }}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="Workstreams Loaded"
            value={`${loadedWorkstreamCount}/${totalWorkstreamCount}`}
            suffix={
              <Progress
                type="circle"
                percent={progressPercentage}
                size={40}
                format={(percent) => `${percent}%`}
              />
            }
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Original Estimate"
            value={formatDays(totalOriginalEstimateDays)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Time Spent"
            value={formatDays(totalTimeSpentDays)}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Time Remaining"
            value={formatDays(totalTimeRemainingDays)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{
              color: totalTimeRemainingDays > 0 ? "#ff4d4f" : "#52c41a",
            }}
          />
        </Col>
      </Row>

      {totalOriginalEstimateDays > 0 && (
        <Row style={{ marginTop: "16px" }}>
          <Col span={24}>
            <Text type="secondary">
              Progress: {formatDays(totalTimeSpentDays)} of{" "}
              {formatDays(totalOriginalEstimateDays)} completed (
              {Math.round(
                (totalTimeSpentDays / totalOriginalEstimateDays) * 100
              )}
              %)
            </Text>
          </Col>
        </Row>
      )}
    </Card>
  );
};
