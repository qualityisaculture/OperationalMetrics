import React, { useState, useMemo } from "react";
import {
  Button,
  Input,
  Table,
  Typography,
  Space,
  Alert,
  Modal,
  Select,
  Card,
  Divider,
  Progress,
  List,
  Tag,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useBitBucketRepositories } from "./hooks/useBitBucketRepositories";
import {
  BitBucketRepository,
  BitBucketPullRequest,
} from "../../server/BitBucketRequester";

const { Title, Text } = Typography;
const { Option } = Select;

const BitBucketPRs: React.FC = () => {
  const {
    state,
    loadRepositories,
    setWorkspace,
    loadPullRequestsForRepository,
    setSelectedRepository,
    loadPullRequestsForAllRepositories,
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
    isLoadingAllPRs,
    repositoryProgress,
  } = state;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);

  // Get all PRs from all repositories
  const allPRs = useMemo(() => {
    return pullRequests.flatMap((repoData) => repoData.pullRequests);
  }, [pullRequests]);

  // Extract unique authors from all PRs
  const uniqueAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    allPRs.forEach((pr) => {
      const authorName =
        pr.author?.display_name ||
        pr.author?.user?.displayName ||
        pr.author?.user?.name ||
        "Unknown";
      if (authorName) {
        authorSet.add(authorName);
      }
    });
    return Array.from(authorSet).sort();
  }, [allPRs]);

  // Filter PRs by selected authors (if any selected)
  const filteredPRs = useMemo(() => {
    if (selectedAuthors.length === 0) {
      return allPRs;
    }
    return allPRs.filter((pr) => {
      const authorName =
        pr.author?.display_name ||
        pr.author?.user?.displayName ||
        pr.author?.user?.name ||
        "Unknown";
      return selectedAuthors.includes(authorName);
    });
  }, [allPRs, selectedAuthors]);

  // Group PRs by month and count them (using merged/closed date)
  const prsByMonth = useMemo(() => {
    const monthMap = new Map<
      string,
      { label: string; count: number; sortKey: string }
    >();

    filteredPRs.forEach((pr) => {
      // Only count merged PRs
      const isMerged =
        pr.state === "MERGED" ||
        pr.merged === true ||
        (pr.closed === true && pr.state !== "DECLINED");

      if (!isMerged) {
        return; // Skip non-merged PRs
      }

      let date: Date | null = null;

      // Use closed/merged date for grouping
      if (pr.closedDate) {
        date = new Date(pr.closedDate);
      }

      // If no closed date available, skip this PR
      if (!date || isNaN(date.getTime())) {
        return;
      }

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.count += 1;
      } else {
        monthMap.set(monthKey, {
          label: monthLabel,
          count: 1,
          sortKey: monthKey,
        });
      }
    });

    // Convert to array and sort by sortKey (which is YYYY-MM format)
    const entries = Array.from(monthMap.values());
    entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return entries.map(({ label, count }) => ({ month: label, count }));
  }, [filteredPRs]);

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
      title: "Actions",
      key: "actions",
      render: (_: any, record: BitBucketRepository) => {
        // Use full_name as primary identifier since it's unique (workspace/repo)
        const repoId = record.full_name || record.uuid || record.slug;
        const isThisRepoLoading = loadingRepoId === repoId;
        const repoPRs = pullRequests.find(
          (r) =>
            (r.repository.full_name ||
              r.repository.uuid ||
              r.repository.slug) === repoId
        );
        // Check if PRs have been loaded (even if count is 0)
        const hasLoadedPRs = repoPRs !== undefined;
        const prCount = repoPRs?.pullRequests.length || 0;

        return (
          <Space>
            <Button
              size="small"
              type={hasLoadedPRs ? "default" : "primary"}
              onClick={() =>
                loadPullRequestsForRepository(record, hasLoadedPRs)
              }
              loading={isThisRepoLoading}
            >
              {hasLoadedPRs ? "Refresh PRs" : "Request PRs"}
            </Button>
            {hasLoadedPRs && (
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setSelectedRepository(record);
                  setIsModalVisible(true);
                }}
                disabled={prCount === 0}
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
        // API 1.0 uses links.self array
        let href: string | undefined;
        if (
          record.links?.self &&
          Array.isArray(record.links.self) &&
          record.links.self.length > 0
        ) {
          href = record.links.self[0].href;
        } else if (record.links?.html?.href) {
          href = record.links.html.href;
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
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: number | undefined) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
  ];

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedRepository(null);
  };

  const handleCloseProgressModal = () => {
    if (!isLoadingAllPRs) {
      setIsProgressModalVisible(false);
    }
  };

  // Calculate progress statistics
  const progressStats = useMemo(() => {
    const progressArray = Array.from(repositoryProgress.values());
    const total = progressArray.length;
    const completed = progressArray.filter(
      (p) => p.status === "completed"
    ).length;
    const loading = progressArray.filter((p) => p.status === "loading").length;
    const error = progressArray.filter((p) => p.status === "error").length;
    const pending = progressArray.filter((p) => p.status === "pending").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, loading, error, pending, percent };
  }, [repositoryProgress]);

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>BitBucket Repositories</Title>

      <Space
        direction="vertical"
        style={{ width: "100%", marginBottom: "20px" }}
      >
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
              <Button
                type="primary"
                onClick={async () => {
                  setIsProgressModalVisible(true);
                  await loadPullRequestsForAllRepositories(false);
                }}
                loading={isLoadingAllPRs}
                disabled={isLoadingAllPRs}
              >
                Load PRs for All Repositories
              </Button>
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

      {/* Author Filter and Monthly PR Count Section */}
      {allPRs.length > 0 && (
        <>
          <Divider />
          <Card>
            <Title level={3}>PR Analytics</Title>
            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: "20px" }}
            >
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Author:
                </Text>
                <Select
                  mode="multiple"
                  placeholder="Select authors (leave empty to show all)"
                  value={selectedAuthors}
                  onChange={setSelectedAuthors}
                  style={{ width: "100%", maxWidth: "600px" }}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const label =
                      typeof option?.label === "string"
                        ? option.label
                        : String(option?.label ?? "");
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {uniqueAuthors.map((author) => (
                    <Option key={author} value={author} label={author}>
                      {author}
                    </Option>
                  ))}
                </Select>
              </div>
              <Text type="secondary">
                Showing {filteredPRs.length} PR
                {filteredPRs.length !== 1 ? "s" : ""}
                {selectedAuthors.length > 0
                  ? ` from ${selectedAuthors.length} selected author${selectedAuthors.length !== 1 ? "s" : ""}`
                  : " from all authors"}
              </Text>
            </Space>

            {prsByMonth.length > 0 && (
              <div>
                <Title level={4}>PRs per Month</Title>
                <Table
                  dataSource={prsByMonth}
                  columns={[
                    {
                      title: "Month",
                      dataIndex: "month",
                      key: "month",
                    },
                    {
                      title: "Number of PRs",
                      dataIndex: "count",
                      key: "count",
                      render: (count: number) => <Text strong>{count}</Text>,
                    },
                  ]}
                  rowKey="month"
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* Progress Modal */}
      <Modal
        title="Loading PRs for All Repositories"
        open={isProgressModalVisible}
        onCancel={handleCloseProgressModal}
        footer={[
          <Button
            key="close"
            onClick={handleCloseProgressModal}
            disabled={isLoadingAllPRs}
          >
            {isLoadingAllPRs ? "Processing..." : "Close"}
          </Button>,
        ]}
        width={800}
        closable={!isLoadingAllPRs}
        maskClosable={!isLoadingAllPRs}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            message="Loading PRs"
            description={
              isLoadingAllPRs
                ? "Loading pull requests for all repositories in parallel. Since they are cached, this should be fast after the first time."
                : "All repositories have been processed."
            }
            type={isLoadingAllPRs ? "info" : "success"}
            showIcon
            style={{ marginBottom: "16px" }}
          />

          {progressStats.total > 0 && (
            <>
              <div>
                <Text strong>Overall Progress: </Text>
                <Progress
                  percent={progressStats.percent}
                  status={
                    isLoadingAllPRs
                      ? "active"
                      : progressStats.error > 0
                        ? "exception"
                        : "success"
                  }
                  style={{ marginTop: "8px" }}
                />
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: "8px" }}
                >
                  {progressStats.completed} of {progressStats.total}{" "}
                  repositories completed
                  {progressStats.error > 0 &&
                    ` (${progressStats.error} errors)`}
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Repository Status:</Text>
                <List
                  size="small"
                  dataSource={Array.from(repositoryProgress.values())}
                  renderItem={(progress) => {
                    const repoName =
                      progress.repository.full_name ||
                      progress.repository.name ||
                      progress.repository.slug;
                    const repoId =
                      progress.repository.full_name ||
                      progress.repository.uuid ||
                      progress.repository.slug;

                    let icon;
                    let statusColor;
                    let statusText;

                    switch (progress.status) {
                      case "completed":
                        icon = (
                          <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        );
                        statusColor = "success";
                        statusText = `Completed (${progress.prCount || 0} PRs)`;
                        break;
                      case "loading":
                        icon = <LoadingOutlined style={{ color: "#1890ff" }} />;
                        statusColor = "processing";
                        statusText = "Loading...";
                        break;
                      case "error":
                        icon = (
                          <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                        );
                        statusColor = "error";
                        statusText = progress.error || "Error";
                        break;
                      default:
                        icon = null;
                        statusColor = "default";
                        statusText = "Pending";
                    }

                    return (
                      <List.Item>
                        <Space
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Space>
                            {icon}
                            <Text>{repoName}</Text>
                          </Space>
                          <Tag color={statusColor}>{statusText}</Tag>
                        </Space>
                      </List.Item>
                    );
                  }}
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    marginTop: "12px",
                  }}
                />
              </div>
            </>
          )}
        </Space>
      </Modal>

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
