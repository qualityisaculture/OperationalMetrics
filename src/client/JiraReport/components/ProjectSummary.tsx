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

  // Temporarily zero out all values while we fix the calculation logic
  const {
    totalOriginalEstimate = 0,
    totalTimeSpent = 0,
    totalTimeRemaining = 0,
    loadedWorkstreamCount = 0,
    totalWorkstreamCount = 0,
  } = projectAggregatedData;

  const progressPercentage = 0; // Temporarily set to 0

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "0h";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    // Round to 1 decimal place for better readability
    const roundedMinutes = Math.round(remainingMinutes * 10) / 10;
    return `${hours}h ${roundedMinutes}m`;
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
            value={formatTime(totalOriginalEstimate)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Time Spent"
            value={formatTime(totalTimeSpent)}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Time Remaining"
            value={formatTime(totalTimeRemaining)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{
              color: totalTimeRemaining > 0 ? "#faad14" : "#52c41a",
            }}
          />
        </Col>
      </Row>

      {totalOriginalEstimate > 0 && (
        <Row style={{ marginTop: "16px" }}>
          <Col span={24}>
            <Text type="secondary">
              Progress: {formatTime(totalTimeSpent)} of{" "}
              {formatTime(totalOriginalEstimate)} completed (
              {Math.round((totalTimeSpent / totalOriginalEstimate) * 100)}%)
            </Text>
          </Col>
        </Row>
      )}
    </Card>
  );
};
