import React from "react";
import { Table, Card, Typography } from "antd";
import { FormsData } from "../types";

const { Title, Text } = Typography;

interface RawDataTableProps {
  formsData: FormsData[];
}

export const RawDataTable: React.FC<RawDataTableProps> = ({ formsData }) => {
  console.log("RawDataTable render - formsData:", formsData);
  console.log("RawDataTable render - formsData.length:", formsData.length);

  if (formsData.length === 0) {
    console.log("RawDataTable - no forms data, returning null");
    return null;
  }

  // Use the first sheet's data for display
  const firstSheet = formsData[0];
  console.log("RawDataTable - firstSheet:", firstSheet);

  if (!firstSheet) {
    console.log("RawDataTable - firstSheet is undefined, returning null");
    return null;
  }

  return (
    <Card title="Raw Data Table" size="small">
      <div style={{ marginBottom: "10px" }}>
        <Text type="secondary">
          Showing data from: {firstSheet.fileName} - {firstSheet.name}
        </Text>
      </div>

      <Table
        dataSource={firstSheet.data}
        columns={firstSheet.columns}
        scroll={{ x: true }}
        size="small"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
    </Card>
  );
};
