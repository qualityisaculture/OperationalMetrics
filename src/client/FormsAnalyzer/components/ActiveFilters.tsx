import React from "react";
import {
  Card,
  Tag,
  Space,
  Typography,
  Button,
  Row,
  Col,
  Statistic,
} from "antd";
import { FilterOutlined, CloseOutlined } from "@ant-design/icons";
import { FilterCriteria, FormsData } from "../types";

const { Title, Text } = Typography;

interface ActiveFiltersProps {
  activeFilters: FilterCriteria[];
  originalData: FormsData[];
  filteredData: FormsData[];
  onRemoveFilter: (question: string) => void;
  onClearAllFilters: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  activeFilters,
  originalData,
  filteredData,
  onRemoveFilter,
  onClearAllFilters,
}) => {
  if (activeFilters.length === 0) return null;

  const originalCount = originalData[0]?.data.length || 0;
  const filteredCount = filteredData[0]?.data.length || 0;
  const reductionPercentage =
    originalCount > 0
      ? ((originalCount - filteredCount) / originalCount) * 100
      : 0;

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          Active Filters
        </Space>
      }
      size="small"
      style={{ marginBottom: "16px" }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col span={8}>
          <Statistic
            title="Original Responses"
            value={originalCount}
            suffix="responses"
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Filtered Responses"
            value={filteredCount}
            suffix="responses"
            valueStyle={{
              color: filteredCount < originalCount ? "#1890ff" : "#3f8600",
            }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Reduction"
            value={reductionPercentage}
            suffix="%"
            precision={1}
            valueStyle={{ color: "#cf1322" }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: "16px" }}>
        <Title level={5}>Applied Filters:</Title>
        <Space wrap>
          {activeFilters.map((filter) => (
            <Tag
              key={filter.question}
              color="blue"
              closable
              onClose={() => onRemoveFilter(filter.question)}
              style={{ marginBottom: "8px" }}
            >
              <strong>{filter.question}:</strong>{" "}
              {filter.selectedAnswers.join(", ")}
            </Tag>
          ))}
        </Space>
      </div>

      <div style={{ marginTop: "16px" }}>
        <Button
          icon={<CloseOutlined />}
          onClick={onClearAllFilters}
          size="small"
          danger
        >
          Clear All Filters
        </Button>
      </div>
    </Card>
  );
};
