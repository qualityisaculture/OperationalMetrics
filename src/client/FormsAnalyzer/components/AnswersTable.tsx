import React from "react";
import { Table, Typography } from "antd";

const { Text } = Typography;

interface AnswerData {
  answer: string;
  count: number;
  percentage: number;
}

interface AnswersTableProps {
  answers: AnswerData[];
}

export const AnswersTable: React.FC<AnswersTableProps> = ({ answers }) => {
  const columns = [
    {
      title: "Answer",
      dataIndex: "answer",
      key: "answer",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      width: 100,
      align: "right" as const,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      width: 120,
      align: "right" as const,
      render: (value: number) => `${value.toFixed(1)}%`,
    },
  ];

  const dataSource = answers.map((answer, index) => ({
    key: index,
    answer: answer.answer,
    count: answer.count,
    percentage: answer.percentage,
  }));

  return (
    <div style={{ marginTop: "16px" }}>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        style={{ marginTop: "8px" }}
      />
    </div>
  );
};
