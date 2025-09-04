import React, { useState } from "react";
import { Bar } from "@ant-design/charts";
import { Card, Typography, Button, Space, List } from "antd";
import { BarChartOutlined, HolderOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface AnswerData {
  answer: string;
  count: number;
  percentage: number;
}

interface ReorderableBarChartProps {
  answers: AnswerData[];
  question: string;
  totalResponses: number;
}

export const ReorderableBarChart: React.FC<ReorderableBarChartProps> = ({
  answers: initialAnswers,
  question,
  totalResponses,
}) => {
  const [answers, setAnswers] = useState(initialAnswers);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  // Update local state when props change (e.g., when filters are applied)
  React.useEffect(() => {
    setAnswers(initialAnswers);
  }, [initialAnswers]);

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const draggedRow = answers[dragIndex];
    const newAnswers = [...answers];
    newAnswers.splice(dragIndex, 1);
    newAnswers.splice(hoverIndex, 0, draggedRow);
    setAnswers(newAnswers);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (dragIndex !== dropIndex) {
      moveRow(dragIndex, dropIndex);
    }
  };

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
    height: Math.max(200, answers.length * 40),
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
    legend: false,
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
    <div style={{ marginTop: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <Space>
          <Button
            type={viewMode === "chart" ? "primary" : "default"}
            icon={<BarChartOutlined />}
            size="small"
            onClick={() => setViewMode("chart")}
          >
            Chart
          </Button>
          <Button
            type={viewMode === "table" ? "primary" : "default"}
            icon={<HolderOutlined />}
            size="small"
            onClick={() => setViewMode("table")}
          >
            Reorder
          </Button>
        </Space>
      </div>

      {viewMode === "chart" ? (
        <Bar {...config} />
      ) : (
        <List
          dataSource={answers}
          renderItem={(item, index) => (
            <List.Item
              key={item.answer}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                cursor: "move",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ marginRight: "12px", color: "#999" }}>
                  <HolderOutlined />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong>{item.answer}</Text>
                </div>
                <div
                  style={{
                    marginRight: "12px",
                    minWidth: "60px",
                    textAlign: "right",
                  }}
                >
                  <Text>{item.count}</Text>
                </div>
                <div style={{ minWidth: "80px", textAlign: "right" }}>
                  <Text type="secondary">{item.percentage.toFixed(1)}%</Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};
