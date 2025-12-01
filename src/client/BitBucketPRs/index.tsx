import React, { useState } from "react";
import {
  Button,
  Input,
  Table,
  Typography,
  Space,
  Alert,
  Modal,
} from "antd";
import { useBitBucketRepositories } from "./hooks/useBitBucketRepositories";
import {
  BitBucketRepository,
  BitBucketPullRequest,
} from "../../server/BitBucketRequester";

const { Title, Text } = Typography;

const BitBucketPRs: React.FC = () => {
  const {
    state,
    loadRepositories,
    setWorkspace,
    loadPullRequestsForRepository,
    setSelectedRepository,
  } = useBitBucketRepositories();
  const {
    repositories,
    isLoading,
    error,
    workspace,
    pullRequests,
    isLoadingPRs,
    prsError,
    loadingRepoId,
    selectedRepository,
    prsLastUpdated,
  } = state;
  const [isModalVisible, setIsModalVisible] = useState(false);

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
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: BitBucketRepository) => {
        // Use full_name as primary identifier since it's unique (workspace/repo)
        const repoId = record.full_name || record.uuid || record.slug;
        const isThisRepoLoading = loadingRepoId === repoId;
        const repoPRs = pullRequests.find(
          (r) =>
            (r.repository.full_name || r.repository.uuid || r.repository.slug) ===
            repoId
        );
        const hasPRs = repoPRs && repoPRs.pullRequests.length > 0;
        const prCount = repoPRs?.pullRequests.length || 0;

        return (
          <Space>
            <Button
              size="small"
              type={hasPRs ? "default" : "primary"}
              onClick={() => loadPullRequestsForRepository(record, hasPRs)}
              loading={isThisRepoLoading}
            >
              {hasPRs ? "Refresh PRs" : "Request PRs"}
            </Button>
            {hasPRs && (
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setSelectedRepository(record);
                  setIsModalVisible(true);
                }}
              >
                View PRs ({prCount})
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // Get PRs for the selected repository
  const selectedRepoPRs = selectedRepository
    ? pullRequests.find(
        (r) =>
          (r.repository.full_name || r.repository.uuid || r.repository.slug) ===
          (selectedRepository.full_name ||
            selectedRepository.uuid ||
            selectedRepository.slug)
      )?.pullRequests || []
    : [];

  const prColumns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: BitBucketPullRequest) => {
        // Handle both API 2.0 (links.html.href) and API 1.0 (links.self array)
        let href: string | undefined;
        if (record.links?.html?.href) {
          href = record.links.html.href;
        } else if (record.links?.self && Array.isArray(record.links.self) && record.links.self.length > 0) {
          href = record.links.self[0].href;
        }
        
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
      title: "Author",
      dataIndex: "author",
      key: "author",
      render: (author: BitBucketPullRequest["author"]) =>
        author?.display_name ||
        author?.user?.displayName ||
        author?.user?.name ||
        "Unknown",
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (state: string) => {
        const color =
          state === "MERGED"
            ? "green"
            : state === "OPEN"
            ? "blue"
            : state === "DECLINED"
            ? "red"
            : "default";
        return <Text style={{ color }}>{state}</Text>;
      },
    },
    {
      title: "Merged",
      dataIndex: "merged",
      key: "merged",
      render: (merged: boolean | undefined, record: BitBucketPullRequest) => {
        // Check merged field, state, and closed field (API 1.0)
        const isMerged =
          merged ||
          record.state === "MERGED" ||
          (record.closed === true && record.state !== "DECLINED");
        return isMerged ? "Yes" : "No";
      },
    },
    {
      title: "Created",
      dataIndex: "created_on",
      key: "created_on",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedRepository(null);
  };

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
            <Space style={{ marginBottom: "16px" }}>
              <p style={{ margin: 0 }}>
                Found {repositories.length} repositories
              </p>
              {prsLastUpdated && (
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  PRs last updated: {new Date(prsLastUpdated).toLocaleString()}
                </Text>
              )}
            </Space>

            {prsError && (
              <Alert
                message="Error Loading PRs"
                description={prsError}
                type="error"
                showIcon
                closable
                style={{ marginBottom: "16px" }}
              />
            )}

            <Table
              dataSource={repositories}
              columns={columns}
              rowKey={(record, index) =>
                record.uuid || record.full_name || `${record.slug}-${index}`
              }
              loading={isLoading}
              pagination={{ pageSize: 50 }}
            />
          </div>
        )}
      </Space>

      <Modal
        title={
          selectedRepository
            ? `Pull Requests - ${selectedRepository.full_name || selectedRepository.name} (Last 3 Months)`
            : "Pull Requests (Last 3 Months)"
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Close
          </Button>,
        ]}
        width={1200}
      >
        {selectedRepository && (
          <div style={{ marginBottom: "16px" }}>
            <Text>
              Showing {selectedRepoPRs.length} pull requests for{" "}
              {selectedRepository.full_name || selectedRepository.name}
            </Text>
          </div>
        )}
        <Table
          dataSource={selectedRepoPRs}
          columns={prColumns}
          rowKey={(record, index) => `${record.id || index}`}
          pagination={{ pageSize: 50 }}
          scroll={{ x: true }}
        />
      </Modal>
    </div>
  );
};

export default BitBucketPRs;

