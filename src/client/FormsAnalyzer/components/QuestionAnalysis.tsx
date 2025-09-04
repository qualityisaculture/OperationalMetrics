import React, { useState } from "react";
import { Card, Select, Tag, Space, Typography, Button, Row, Col } from "antd";
import { FilterOutlined, ClearOutlined } from "@ant-design/icons";
import {
  QuestionAnalysis as QuestionAnalysisType,
  FilterCriteria,
} from "../types";
import { ReorderableBarChart } from "./ReorderableBarChart";
import { DivergingStackedBarChart } from "./DivergingStackedBarChart";
import { AnswersTable } from "./AnswersTable";

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

type ChartType = "bar" | "diverging" | "table";

export const QuestionAnalysis: React.FC<QuestionAnalysisProps> = ({
  questionAnalysis,
  activeFilters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAllFilters,
}) => {
  const [chartTypes, setChartTypes] = useState<Record<number, ChartType>>({});

  const getChartType = (questionIndex: number): ChartType => {
    // If user has manually selected a chart type, use that
    if (chartTypes[questionIndex]) {
      return chartTypes[questionIndex];
    }

    // Auto-detect Likert scale questions and default to diverging
    const questionData = questionAnalysis[questionIndex];
    if (questionData && hasLikertScaleAnswers(questionData.answers)) {
      return "diverging";
    }

    // Default to bar chart for other questions
    return "bar";
  };

  const handleChartTypeChange = (
    questionIndex: number,
    chartType: ChartType
  ) => {
    setChartTypes((prev) => ({
      ...prev,
      [questionIndex]: chartType,
    }));
  };

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
              <Col span={8}>
                <Title level={5} style={{ margin: 0 }}>
                  {questionData.question}
                </Title>
                <Text type="secondary">
                  {questionData.totalResponses} responses
                </Text>
              </Col>

              <Col span={6}>
                <Select
                  value={getChartType(index)}
                  onChange={(value) => handleChartTypeChange(index, value)}
                  style={{ width: "100%" }}
                  size="small"
                >
                  <Option value="bar">Bar Chart</Option>
                  <Option value="diverging">Diverging Stacked</Option>
                  <Option value="table">Table</Option>
                </Select>
              </Col>

              <Col span={10}>
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

            {getChartType(index) === "bar" ? (
              <ReorderableBarChart
                answers={questionData.answers}
                question={questionData.question}
                totalResponses={questionData.totalResponses}
              />
            ) : getChartType(index) === "diverging" ? (
              <DivergingStackedBarChart
                answers={questionData.answers}
                question={questionData.question}
                totalResponses={questionData.totalResponses}
              />
            ) : (
              <AnswersTable answers={questionData.answers} />
            )}
          </Card>
        ))}
      </Space>
    </Card>
  );
};

// Helper function to detect if answers contain Likert scale options
function hasLikertScaleAnswers(
  answers: { answer: string; count: number; percentage: number }[]
): boolean {
  const likertOptions = [
    "Strongly Disagree",
    "Disagree",
    "Neutral",
    "Agree",
    "Strongly Agree",
  ];

  return answers.some((answer) =>
    likertOptions.some(
      (likertOption) =>
        answer.answer.toLowerCase() === likertOption.toLowerCase()
    )
  );
}
