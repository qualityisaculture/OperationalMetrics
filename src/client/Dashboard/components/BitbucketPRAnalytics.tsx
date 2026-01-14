import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  Button,
  Space,
  Card,
  Divider,
  Typography,
  Select,
  Table,
  Form,
  Modal,
  Popconfirm,
  message,
  Alert,
  Input,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useBitBucketRepositories } from "../../BitBucketPRs/hooks/useBitBucketRepositories";
import {
  BitBucketPullRequest,
} from "../../../server/BitBucketRequester";
import { useBitBucketGroups, UserGroup } from "../hooks/useBitBucketGroups";

const { Title, Text } = Typography;
const { Option } = Select;

// User Group Types - imported from hook

interface UserPRsTableProps {
  user: string;
  allPRs: BitBucketPullRequest[];
  prColumns: any[];
}

const UserPRsTable: React.FC<UserPRsTableProps> = ({
  user,
  allPRs,
  prColumns,
}) => {
  // Filter PRs by user and sort by createdDate in reverse chronological order
  const userPRs = useMemo(() => {
    const filtered = allPRs.filter((pr) => {
      const authorName =
        pr.author?.display_name ||
        pr.author?.user?.displayName ||
        pr.author?.user?.name ||
        "Unknown";
      return authorName === user;
    });

    // Sort by createdDate in reverse chronological order (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.createdDate || 0;
      const dateB = b.createdDate || 0;
      return dateB - dateA; // Reverse order: newest first
    });
  }, [allPRs, user]);

  if (userPRs.length === 0) {
    return <Text type="secondary">No pull requests found for {user}.</Text>;
  }

  return (
    <div>
      <Text type="secondary" style={{ marginBottom: "16px", display: "block" }}>
        Showing {userPRs.length} pull request
        {userPRs.length !== 1 ? "s" : ""} by {user} (newest first)
      </Text>
      <Table
        dataSource={userPRs}
        columns={prColumns}
        rowKey={(record, index) => `${record.id || index}`}
        pagination={{ pageSize: 50 }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
};

interface BitbucketPRAnalyticsProps {
  workspace?: string;
  selectedGroup?: string;
  readOnly?: boolean;
}

export interface BitbucketPRAnalyticsRef {
  requestData: () => void;
}

const BitbucketPRAnalytics = forwardRef<BitbucketPRAnalyticsRef, BitbucketPRAnalyticsProps>(({
  workspace: initialWorkspace,
  selectedGroup: initialSelectedGroup,
  readOnly = false,
}, ref) => {
  const {
    state,
    loadRepositories,
    setWorkspace,
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
    isLoadingAllPRs,
    repositoryProgress,
  } = state;

  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { groups: userGroups, saveGroups } = useBitBucketGroups();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialSelectedGroup || null);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [isGroupListModalVisible, setIsGroupListModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupForm] = Form.useForm();
  const [hasRequestedData, setHasRequestedData] = useState(false);
  const [pendingPRLoad, setPendingPRLoad] = useState(false);

  // Set initial workspace if provided
  useEffect(() => {
    if (initialWorkspace && !workspace) {
      setWorkspace(initialWorkspace);
    }
  }, [initialWorkspace, workspace, setWorkspace]);

  // Auto-load PRs once repositories are available (if we were waiting for them)
  useEffect(() => {
    if (pendingPRLoad && repositories.length > 0 && !isLoading && !isLoadingAllPRs) {
      const hasLoadedPRs = pullRequests.length > 0;
      loadPullRequestsForAllRepositories(hasLoadedPRs).then(() => {
        setHasRequestedData(true);
        setPendingPRLoad(false);
      }).catch((error) => {
        console.error("Error loading PRs:", error);
        message.error("Failed to load PRs. Please try again.");
        setPendingPRLoad(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPRLoad, repositories.length, isLoading, isLoadingAllPRs, pullRequests.length]);

  // Set initial selected group if provided
  useEffect(() => {
    if (initialSelectedGroup && !selectedGroup) {
      setSelectedGroup(initialSelectedGroup);
    }
  }, [initialSelectedGroup, selectedGroup]);

  // Don't auto-load repositories - wait for user to click "Request All PRs"

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

  // Get users from selected group
  const usersInSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];
    const group = userGroups.find((g) => g.id === selectedGroup);
    return group ? group.users : [];
  }, [selectedGroup, userGroups]);

  // Filter PRs by selected authors or selected group
  const filteredPRs = useMemo(() => {
    // If a group is selected, use users from that group
    const usersToFilter = selectedGroup
      ? usersInSelectedGroup
      : selectedAuthors;

    if (usersToFilter.length === 0) {
      return allPRs;
    }
    return allPRs.filter((pr) => {
      const authorName =
        pr.author?.display_name ||
        pr.author?.user?.displayName ||
        pr.author?.user?.name ||
        "Unknown";
      return usersToFilter.includes(authorName);
    });
  }, [allPRs, selectedAuthors, selectedGroup, usersInSelectedGroup]);

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
    const entries = Array.from(monthMap.entries());
    entries.sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey));

    return entries.map(([monthKey, { label, count }]) => ({
      month: label,
      count,
      monthKey,
    }));
  }, [filteredPRs]);

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

  // Group management functions
  const handleCreateGroup = () => {
    setEditingGroup(null);
    groupForm.resetFields();
    setIsGroupListModalVisible(false);
    setIsGroupModalVisible(true);
  };

  const handleManageGroups = () => {
    setIsGroupListModalVisible(true);
  };

  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    groupForm.setFieldsValue({
      name: group.name,
      users: group.users,
    });
    setIsGroupListModalVisible(false);
    setIsGroupModalVisible(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const updatedGroups = userGroups.filter((g) => g.id !== groupId);
      await saveGroups(updatedGroups);
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
      message.success("Group deleted successfully");
    } catch (error) {
      message.error("Failed to delete group");
    }
  };

  const handleSaveGroup = () => {
    groupForm.validateFields().then(async (values) => {
      try {
        if (editingGroup) {
          // Update existing group
          const updatedGroups = userGroups.map((g) =>
            g.id === editingGroup.id
              ? { ...g, name: values.name, users: values.users || [] }
              : g
          );
          await saveGroups(updatedGroups);
          message.success("Group updated successfully");
        } else {
          // Create new group
          const newGroup: UserGroup = {
            id: `group-${Date.now()}`,
            name: values.name,
            users: values.users || [],
          };
          await saveGroups([...userGroups, newGroup]);
          message.success("Group created successfully");
        }
        setIsGroupModalVisible(false);
        setEditingGroup(null);
        groupForm.resetFields();
      } catch (error) {
        message.error("Failed to save group");
      }
    });
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalVisible(false);
    setEditingGroup(null);
    groupForm.resetFields();
  };

  const handleCloseGroupListModal = () => {
    setIsGroupListModalVisible(false);
  };

  const handleRequestAllPRs = async () => {
    try {
      // First ensure we have repositories loaded
      if (repositories.length === 0) {
        // Set flag to auto-load PRs once repositories are available
        setPendingPRLoad(true);
        await loadRepositories();
        // If there's an error, clear the pending flag
        if (error) {
          setPendingPRLoad(false);
          message.error(`Failed to load repositories: ${error}`);
          return;
        }
        // The useEffect will handle loading PRs once repositories are available
        return;
      }
      
      // If we already have repositories, load PRs directly
      const hasLoadedPRs = pullRequests.length > 0;
      await loadPullRequestsForAllRepositories(hasLoadedPRs);
      setHasRequestedData(true);
    } catch (error) {
      console.error("Error loading PRs:", error);
      message.error("Failed to load PRs. Please try again.");
      setPendingPRLoad(false);
    }
  };

  useImperativeHandle(ref, () => ({
    requestData: handleRequestAllPRs,
  }));

  // Show request button if no data has been requested yet
  if (!hasRequestedData && allPRs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Text type="secondary" style={{ display: "block", marginBottom: "1rem" }}>
          Click the button below to load PR data for all repositories.
        </Text>
        <Button
          type="primary"
          onClick={handleRequestAllPRs}
          loading={isLoadingAllPRs || isLoading}
          disabled={isLoadingAllPRs || isLoading}
        >
          Request All PRs
        </Button>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginTop: "1rem" }}
          />
        )}
      </div>
    );
  }

  // Show PR Analytics section
  return (
    <div>
      {allPRs.length === 0 && hasRequestedData && (
        <Alert
          message="No PRs Found"
          description="No pull requests were found for the repositories. Try refreshing."
          type="info"
          showIcon
          style={{ marginBottom: "1rem" }}
          action={
            <Button
              size="small"
              onClick={handleRequestAllPRs}
              loading={isLoadingAllPRs}
            >
              Refresh
            </Button>
          }
        />
      )}

      {prsError && (
        <Alert
          message="Error Loading PRs"
          description={prsError}
          type="error"
          showIcon
          closable
          style={{ marginBottom: "1rem" }}
        />
      )}

      {allPRs.length > 0 && (
        <>
          <Card>
            <Space
              style={{
                width: "100%",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <Title level={3} style={{ margin: 0 }}>
                PR Analytics
              </Title>
              <Space>
                <Button
                  onClick={handleRequestAllPRs}
                  loading={isLoadingAllPRs}
                  disabled={isLoadingAllPRs}
                >
                  Refresh All PRs
                </Button>
                <Button icon={<UserOutlined />} onClick={handleManageGroups}>
                  Manage User Groups
                </Button>
              </Space>
            </Space>
            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: "20px" }}
            >
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Group:
                </Text>
                <Select
                  placeholder="Select a group (or use individual authors below)"
                  value={selectedGroup}
                  onChange={(value) => {
                    setSelectedGroup(value);
                    setSelectedAuthors([]); // Clear individual author selection when group is selected
                  }}
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    marginBottom: "12px",
                  }}
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
                  {userGroups.map((group) => (
                    <Option key={group.id} value={group.id} label={group.name}>
                      {group.name} ({group.users.length} user
                      {group.users.length !== 1 ? "s" : ""})
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Author:
                </Text>
                <Select
                  mode="multiple"
                  placeholder="Select authors (leave empty to show all)"
                  value={selectedAuthors}
                  onChange={(value) => {
                    setSelectedAuthors(value);
                    setSelectedGroup(null); // Clear group selection when individual authors are selected
                  }}
                  style={{ width: "100%", maxWidth: "600px" }}
                  allowClear
                  showSearch
                  disabled={!!selectedGroup}
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
                {selectedGroup
                  ? ` from group "${userGroups.find((g) => g.id === selectedGroup)?.name || ""}"`
                  : selectedAuthors.length > 0
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

            {/* User PRs Section */}
            <Divider />
            <div style={{ marginTop: "24px" }}>
              <Title level={4}>View PRs by User</Title>
              <Space
                direction="vertical"
                style={{ width: "100%", marginBottom: "16px" }}
              >
                <div>
                  <Text strong style={{ marginRight: "8px" }}>
                    Select User:
                  </Text>
                  <Select
                    placeholder="Select a user to view their PRs"
                    value={selectedUser}
                    onChange={setSelectedUser}
                    style={{ width: "100%", maxWidth: "400px" }}
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
              </Space>

              {selectedUser && (
                <UserPRsTable
                  user={selectedUser}
                  allPRs={allPRs}
                  prColumns={prColumns}
                />
              )}
            </div>
          </Card>
        </>
      )}

      {/* Group Management Modals */}
      <Modal
        title={editingGroup ? "Edit User Group" : "Create User Group"}
        open={isGroupModalVisible}
        onOk={handleSaveGroup}
        onCancel={handleCloseGroupModal}
        width={600}
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: "Please enter a group name" }]}
          >
            <Input placeholder="Enter group name" />
          </Form.Item>
          <Form.Item
            name="users"
            label="Users"
            rules={[
              {
                required: true,
                message: "Please select at least one user",
                type: "array",
                min: 1,
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select users for this group"
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
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Manage User Groups"
        open={isGroupListModalVisible}
        onCancel={handleCloseGroupListModal}
        footer={[
          <Button key="create" type="primary" onClick={handleCreateGroup}>
            <PlusOutlined /> Create Group
          </Button>,
          <Button key="close" onClick={handleCloseGroupListModal}>
            Close
          </Button>,
        ]}
        width={600}
      >
        <div>
          {userGroups.length === 0 ? (
            <Text type="secondary">No groups created yet.</Text>
          ) : (
            <Space direction="vertical" style={{ width: "100%" }}>
              {userGroups.map((group) => (
                <Card
                  key={group.id}
                  size="small"
                  style={{ marginBottom: "8px" }}
                  actions={[
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => handleEditGroup(group)}
                    >
                      Edit
                    </Button>,
                    <Popconfirm
                      title="Delete Group"
                      description="Are you sure you want to delete this group?"
                      onConfirm={() => handleDeleteGroup(group.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                      >
                        Delete
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <div>
                    <Text strong>{group.name}</Text>
                    <div style={{ marginTop: "8px" }}>
                      <Text type="secondary">
                        {group.users.length} user
                        {group.users.length !== 1 ? "s" : ""}:{" "}
                        {group.users.join(", ")}
                      </Text>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          )}
        </div>
      </Modal>
    </div>
  );
});

BitbucketPRAnalytics.displayName = "BitbucketPRAnalytics";

export default BitbucketPRAnalytics;

