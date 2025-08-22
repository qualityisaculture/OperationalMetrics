import React from "react";
import {
  Card,
  Select,
  Tag,
  Progress,
  Space,
  Typography,
  Button,
  Row,
  Col,
  Statistic,
} from "antd";
import { FilterOutlined, ClearOutlined } from "@ant-design/icons";
import {
  QuestionAnalysis as QuestionAnalysisType,
  FilterCriteria,
} from "../types";

const { Title, Text } = Typography;
const { Option } = Select;

interface QuestionAnalysisProps {
  questionAnalysis: QuestionAnalysisType[];
  activeFilters: FilterCriteria[];
  onAddFilter: (filter: FilterCriteria) => void;
  onUpdateFilter: (question: string, selectedAnswers: string[]) => void;
  onRemoveFilter: (question: string) => void;
  onClearAllFilters: () => void;
}

export const QuestionAnalysis: React.FC<QuestionAnalysisProps> = ({
  questionAnalysis,
  activeFilters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAllFilters,
}) => {
  const handleFilterChange = (question: string, selectedAnswers: string[]) => {
    if (selectedAnswers.length === 0) {
      onRemoveFilter(question);
    } else {
      const existingFilter = activeFilters.find((f) => f.question === question);
      if (existingFilter) {
        onUpdateFilter(question, selectedAnswers);
      } else {
        onAddFilter({ question, selectedAnswers });
      }
    }
  };

  const getFilteredAnswers = (question: string) => {
    const filter = activeFilters.find((f) => f.question === question);
    return filter ? filter.selectedAnswers : [];
  };

  const isQuestionFiltered = (question: string) => {
    return activeFilters.some((f) => f.question === question);
  };

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          Question Analysis & Filtering
        </Space>
      }
      size="small"
      extra={
        activeFilters.length > 0 && (
          <Button
            icon={<ClearOutlined />}
            onClick={onClearAllFilters}
            size="small"
          >
            Clear All Filters
          </Button>
        )
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {questionAnalysis.map((questionData, index) => (
          <Card
            key={index}
            size="small"
            style={{
              border: isQuestionFiltered(questionData.question)
                ? "2px solid #1890ff"
                : "1px solid #d9d9d9",
            }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col span={12}>
                <Title level={5} style={{ margin: 0 }}>
                  {questionData.question}
                </Title>
                <Text type="secondary">
                  {questionData.totalResponses} responses
                </Text>
              </Col>

              <Col span={12}>
                <Select
                  mode="multiple"
                  placeholder="Select answers to filter by..."
                  style={{ width: "100%" }}
                  value={getFilteredAnswers(questionData.question)}
                  onChange={(values) =>
                    handleFilterChange(questionData.question, values)
                  }
                  maxTagCount={3}
                >
                  {questionData.answers.map((answer, answerIndex) => (
                    <Option key={answerIndex} value={answer.answer}>
                      {answer.answer} ({answer.count})
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>

            <div style={{ marginTop: "16px" }}>
              <Row gutter={[8, 8]}>
                {questionData.answers.map((answer, answerIndex) => (
                  <Col key={answerIndex} span={8}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <div style={{ marginBottom: "8px" }}>
                        <Text strong>{answer.answer}</Text>
                      </div>
                      <Progress
                        type="circle"
                        size={60}
                        percent={Math.round(answer.percentage)}
                        format={(percent) => `${answer.count}`}
                      />
                      <div style={{ marginTop: "8px" }}>
                        <Text type="secondary">
                          {answer.percentage.toFixed(1)}%
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Card>
        ))}
      </Space>
    </Card>
  );
};
