import React from "react";
import { Table, Card, Alert, Space } from "antd";
import { LiteJiraIssue } from "../../../server/JiraRequester";
import { TABLE_COLUMNS } from "../constants";

interface DataTableProps {
  data: LiteJiraIssue[] | null;
  error: string | null;
  isLoading: boolean;
  jqlQuery: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  error,
  isLoading,
  jqlQuery,
}) => {
  // Enhanced columns with custom rendering
  const enhancedColumns = TABLE_COLUMNS.map((col) => {
    if (col.dataIndex === "key") {
      return {
        ...col,
        render: (text: string) => (
          <a href={`/browse/${text}`} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ),
      };
    }
    if (col.dataIndex === "created" || col.dataIndex === "updated") {
      return {
        ...col,
        render: (text: string) => new Date(text).toLocaleDateString(),
      };
    }
    return col;
  });

  if (error) {
    return (
      <Card title="Results">
        <Alert message="Error" description={error} type="error" showIcon />
      </Card>
    );
  }

  if (!data && !isLoading) {
    return (
      <Card title="Results">
        <Alert
          message="No Data"
          description="Execute a JQL query to see results here."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          Results
          {jqlQuery && (
            <span style={{ fontSize: "12px", color: "#666" }}>
              ({data?.length || 0} issues found)
            </span>
          )}
        </Space>
      }
    >
      <Table
        dataSource={data || []}
        columns={enhancedColumns}
        loading={isLoading}
        rowKey="key"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};
