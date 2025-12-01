import React from "react";
import { Button, Input, Table, Typography, Space, Alert } from "antd";
import { useBitBucketRepositories } from "./hooks/useBitBucketRepositories";
import { BitBucketRepository } from "../../server/BitBucketRequester";

const { Title } = Typography;

const BitBucketPRs: React.FC = () => {
  const { state, loadRepositories, setWorkspace } = useBitBucketRepositories();
  const { repositories, isLoading, error, workspace } = state;

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: BitBucketRepository) => {
        const href = record.links?.html?.href;
        if (href) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {text}
            </a>
          );
        }
        return <span>{text}</span>;
      },
    },
    {
      title: "Full Name",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string | null) => text || "-",
    },
    {
      title: "Private",
      dataIndex: "is_private",
      key: "is_private",
      render: (isPrivate: boolean) => (isPrivate ? "Yes" : "No"),
    },
    {
      title: "Created",
      dataIndex: "created_on",
      key: "created_on",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>BitBucket Repositories</Title>
      
      <Space direction="vertical" style={{ width: "100%", marginBottom: "20px" }}>
        <Space>
          <Input
            placeholder="Workspace (optional for BitBucket Cloud)"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            style={{ width: 300 }}
          />
          <Button type="primary" onClick={loadRepositories} loading={isLoading}>
            Load Repositories
          </Button>
        </Space>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}

        {repositories.length > 0 && (
          <div>
            <p>Found {repositories.length} repositories</p>
            <Table
              dataSource={repositories}
              columns={columns}
              rowKey={(record, index) => record.uuid || record.slug || `repo-${index}`}
              loading={isLoading}
              pagination={{ pageSize: 50 }}
            />
          </div>
        )}
      </Space>
    </div>
  );
};

export default BitBucketPRs;

