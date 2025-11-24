import React, { useMemo } from "react";
import { Table, Typography, Alert } from "antd";
import { Release } from "../types";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

interface Props {
  releases: Release[];
  isLoading: boolean;
  error: string | null;
  projectName: string;
}

export const ReleasesTable: React.FC<Props> = ({
  releases,
  isLoading,
  error,
  projectName,
}) => {
  // Sort releases in reverse chronological order (newest first)
  const sortedReleases = useMemo(() => {
    return [...releases].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      // Reverse order: newest first (larger dates first)
      return dateB - dateA;
    });
  }, [releases]);
  const columns: ColumnsType<Release> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 300,
    },
    {
      title: "Release Date",
      dataIndex: "releaseDate",
      key: "releaseDate",
      width: 200,
      render: (date: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString();
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, record) => {
        if (record.archived) return <Text type="secondary">Archived</Text>;
        if (record.released) return <Text type="success">Released</Text>;
        return <Text>Unreleased</Text>;
      },
    },
  ];

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ marginTop: "16px" }}
      />
    );
  }

  if (!projectName) {
    return (
      <Alert
        message="No Project Selected"
        description="Please select a project from the list above to view its releases."
        type="info"
        showIcon
        style={{ marginTop: "16px" }}
      />
    );
  }

  return (
    <div style={{ marginTop: "24px" }}>
      <Text strong style={{ fontSize: "16px", marginBottom: "16px", display: "block" }}>
        Releases for {projectName}
      </Text>
      <Table
        columns={columns}
        dataSource={sortedReleases}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} releases`,
        }}
      />
    </div>
  );
};

