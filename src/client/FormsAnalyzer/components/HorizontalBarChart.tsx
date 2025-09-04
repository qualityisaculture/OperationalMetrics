import React from "react";
import { Bar } from "@ant-design/charts";
import { Card, Typography } from "antd";

const { Text } = Typography;

interface AnswerData {
  answer: string;
  count: number;
  percentage: number;
}

interface HorizontalBarChartProps {
  answers: AnswerData[];
  question: string;
  totalResponses: number;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  answers,
  question,
  totalResponses,
}) => {
  // Transform the data for the chart
  const chartData = answers.map((answer) => ({
    name: answer.answer,
    value: answer.count,
    percentage: answer.percentage,
  }));

  const config = {
    data: chartData,
    xField: "name",
    yField: "value",
    seriesField: "name",
    height: Math.max(200, answers.length * 40), // Dynamic height based on number of answers
    color: [
      "#1890ff",
      "#52c41a",
      "#faad14",
      "#f5222d",
      "#722ed1",
      "#13c2c2",
      "#eb2f96",
      "#fa8c16",
    ],
    legend: false, // Hide legend since we have labels
    coordinate: {
      transform: [{ type: "transpose" }],
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.name,
          value: `${datum.value} (${datum.percentage.toFixed(1)}%)`,
        };
      },
    },
    label: {
      position: "right" as const,
      formatter: (datum: any) =>
        `${datum.value} (${datum.percentage.toFixed(1)}%)`,
      style: {
        fill: "#666",
        fontSize: 12,
      },
    },
    xAxis: {
      title: {
        text: "Count",
        style: {
          fontSize: 12,
          fill: "#666",
        },
      },
    },
    yAxis: {
      title: {
        text: "Answers",
        style: {
          fontSize: 12,
          fill: "#666",
        },
      },
    },
  };

  return (
    <Card size="small" style={{ marginTop: "16px" }}>
      <div style={{ marginBottom: "8px" }}>
        <Text strong>{question}</Text>
        <br />
        <Text type="secondary">{totalResponses} responses</Text>
      </div>
      <Bar {...config} />
    </Card>
  );
};
