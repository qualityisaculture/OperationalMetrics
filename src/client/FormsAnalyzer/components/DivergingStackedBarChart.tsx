import React from "react";
import { Bar } from "@ant-design/charts";
import { Card, Typography } from "antd";

const { Text } = Typography;

interface AnswerData {
  answer: string;
  count: number;
  percentage: number;
}

interface DivergingStackedBarChartProps {
  answers: AnswerData[];
  question: string;
  totalResponses: number;
}

export const DivergingStackedBarChart: React.FC<
  DivergingStackedBarChartProps
> = ({ answers, question, totalResponses }) => {
  // Reorder answers to follow standard Likert scale order and fill in missing options
  const reorderedAnswers = reorderAnswersToLikertScale(answers);

  // Calculate padding values to center the middle (3rd) value
  const leftPadding = reorderedAnswers[3].count + reorderedAnswers[4].count; // 4th + 5th values
  const rightPadding = reorderedAnswers[0].count + reorderedAnswers[1].count; // 1st + 2nd values

  // Create simple chart data in the format expected by the stacked bar chart
  const chartData = [
    // Left padding (invisible)
    {
      question: " ",
      answer: " ",
      amount: leftPadding,
    },
    // Actual data values in Likert order
    ...reorderedAnswers.map((answer) => ({
      question: " ",
      answer: answer.answer,
      amount: answer.count,
    })),
    // Right padding (invisible)
    {
      question: " ",
      answer: "  ",
      amount: rightPadding,
    },
  ];

  const config = {
    data: chartData,
    xField: "question",
    yField: "amount",
    colorField: "answer",
    stack: true,
    height: 200,
    scale: {
      color: {
        range: [
          "transparent", // left-padding
          "#ff8c00", // 1st answer (dark orange)
          "#ffb366", // 2nd answer (light orange)
          "#808080", // 3rd answer (gray - middle)
          "#87ceeb", // 4th answer (light blue)
          "#4169e1", // 5th answer (dark blue)
          "transparent", // right-padding
        ],
      },
    },
    coordinate: {
      transform: [{ type: "transpose" }],
    },
  };

  return <Bar {...config} />;
};

// Helper function to reorder answers to standard Likert scale order
function reorderAnswersToLikertScale(answers: AnswerData[]): AnswerData[] {
  const likertOrder = [
    "Strongly Disagree",
    "Disagree",
    "Neutral",
    "Agree",
    "Strongly Agree",
  ];

  // Create a map for quick lookup
  const answerMap = new Map(
    answers.map((answer) => [answer.answer.toLowerCase(), answer])
  );

  // Reorder based on Likert scale and fill in missing options
  const reordered: AnswerData[] = [];

  for (const likertItem of likertOrder) {
    // Try to find an exact match (case insensitive)
    const found = Array.from(answerMap.entries()).find(
      ([key]) => key === likertItem.toLowerCase()
    );

    if (found) {
      reordered.push(found[1]);
      answerMap.delete(found[0]);
    } else {
      // Add missing option with 0 count
      reordered.push({
        answer: likertItem,
        count: 0,
        percentage: 0,
      });
    }
  }

  // Add any remaining answers that didn't match the Likert scale
  answerMap.forEach((answer) => reordered.push(answer));

  return reordered;
}
