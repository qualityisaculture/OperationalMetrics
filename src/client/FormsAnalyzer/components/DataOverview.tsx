import React from "react";
import { Card, Row, Col, Statistic, Tag, Typography } from "antd";
import { FormsData } from "../types";

const { Title, Text } = Typography;

interface DataOverviewProps {
  formsData: FormsData[];
}

export const DataOverview: React.FC<DataOverviewProps> = ({ formsData }) => {
  const totalResponses = formsData.reduce(
    (sum, sheet) => sum + sheet.data.length,
    0
  );

  const totalQuestions = formsData.reduce(
    (sum, sheet) => sum + sheet.questionColumns.length,
    0
  );

  const metadataColumns = formsData[0]?.metadataColumns || [];
  const questionColumns = formsData[0]?.questionColumns || [];

  return (
    <Card title="Data Overview" size="small">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Statistic
            title="Total Responses"
            value={totalResponses}
            suffix="responses"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Questions"
            value={totalQuestions}
            suffix="questions"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Files Uploaded"
            value={formsData.length}
            suffix="files"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Metadata Columns"
            value={metadataColumns.length}
            suffix="columns"
          />
        </Col>
      </Row>

      <div style={{ marginTop: "20px" }}>
        <Title level={5}>Metadata Columns (First 5 columns):</Title>
        <div style={{ marginBottom: "10px" }}>
          {metadataColumns.map((column, index) => (
            <Tag key={index} color="blue" style={{ marginBottom: "5px" }}>
              {column || `Column ${index + 1}`}
            </Tag>
          ))}
        </div>

        <Title level={5}>Question Columns:</Title>
        <div>
          {questionColumns.map((column, index) => (
            <Tag key={index} color="green" style={{ marginBottom: "5px" }}>
              {column || `Question ${index + 1}`}
            </Tag>
          ))}
        </div>
      </div>
    </Card>
  );
};
