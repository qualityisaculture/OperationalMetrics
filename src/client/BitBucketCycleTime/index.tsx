import React, { useState, useMemo, useEffect, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Button,
  Table,
  Typography,
  Space,
  Alert,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  DatePicker,
  Tag,
  Form,
  Input,
  List,
  Popconfirm,
  message,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useBitBucketRepositories } from "../BitBucketPRs/hooks/useBitBucketRepositories";
import {
  BitBucketPullRequest,
  BitBucketRepository,
} from "../../server/BitBucketRequester";
import {
  useBitBucketGroups,
  UserGroup,
} from "../Dashboard/hooks/useBitBucketGroups";

const { Title, Text } = Typography;
const { Option } = Select;

interface PRRow {
  key: number;
  title: string;
  link: string | undefined;
  author: string;
  repository: string;
  createdDate: number | undefined;
  mergedDate: number | undefined;
  cycleTime: number | null;
}

const getAuthorName = (pr: BitBucketPullRequest): string =>
  pr.author?.display_name ||
  pr.author?.user?.displayName ||
  pr.author?.user?.name ||
  "Unknown";

const getCycleTimeDays = (pr: BitBucketPullRequest): number | null => {
  if (!pr.createdDate || !pr.closedDate) return null;
  return (pr.closedDate - pr.createdDate) / (1000 * 60 * 60 * 24);
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const columns: ColumnsType<PRRow> = [
  {
    title: "PR Title",
    dataIndex: "title",
    key: "title",
    render: (title: string, record: PRRow) =>
      record.link ? (
        <a href={record.link} target="_blank" rel="noopener noreferrer">
          {title}
        </a>
      ) : (
        title
      ),
  },
  {
    title: "Author",
    dataIndex: "author",
    key: "author",
    width: 160,
  },
  {
    title: "Repository",
    dataIndex: "repository",
    key: "repository",
    width: 200,
  },
  {
    title: "Created",
    dataIndex: "createdDate",
    key: "createdDate",
    width: 120,
    render: (date: number) => (date ? dayjs(date).format("DD MMM YYYY") : "—"),
    sorter: (a: PRRow, b: PRRow) => (a.createdDate ?? 0) - (b.createdDate ?? 0),
  },
  {
    title: "Merged",
    dataIndex: "mergedDate",
    key: "mergedDate",
    width: 120,
    render: (date: number) => (date ? dayjs(date).format("DD MMM YYYY") : "—"),
    sorter: (a: PRRow, b: PRRow) => (a.mergedDate ?? 0) - (b.mergedDate ?? 0),
    defaultSortOrder: "descend",
  },
  {
    title: "Cycle Time (days)",
    dataIndex: "cycleTime",
    key: "cycleTime",
    width: 150,
    render: (days: number | null) => (days !== null ? days.toFixed(1) : "—"),
    sorter: (a: PRRow, b: PRRow) => (a.cycleTime ?? 0) - (b.cycleTime ?? 0),
    align: "right",
  },
];

const BitBucketCycleTime: React.FC = () => {
  const {
    state,
    loadRepositories,
    loadPullRequestsForAllRepositories,
  } = useBitBucketRepositories();
  const {
    repositories,
    isLoading,
    error,
    pullRequests,
    isLoadingAllPRs,
  } = state;

  const { groups: userGroups, saveGroups } = useBitBucketGroups();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().subtract(1, "month").startOf("month"),
    dayjs().subtract(1, "month").endOf("month"),
  ]);

  const [pendingLoad, setPendingLoad] = useState<{ refresh: boolean } | null>(null);

  // Group management state
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [isGroupListModalVisible, setIsGroupListModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupForm] = Form.useForm();

  // Once repos arrive, fire the pending PR load
  useEffect(() => {
    if (pendingLoad && repositories.length > 0) {
      setPendingLoad(null);
      loadPullRequestsForAllRepositories(pendingLoad.refresh);
    }
  }, [repositories, pendingLoad, loadPullRequestsForAllRepositories]);

  const handleLoadAll = useCallback((refresh = false) => {
    if (repositories.length > 0) {
      loadPullRequestsForAllRepositories(refresh);
    } else {
      setPendingLoad({ refresh });
      loadRepositories();
    }
  }, [repositories.length, loadRepositories, loadPullRequestsForAllRepositories]);

  // All unique authors from loaded PRs (for group editor)
  const uniqueAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    pullRequests.forEach(({ pullRequests: prs }) => {
      prs.forEach((pr) => authorSet.add(getAuthorName(pr)));
    });
    return Array.from(authorSet).sort();
  }, [pullRequests]);

  const allMergedPRs = useMemo(() => {
    return pullRequests.flatMap(
      ({ repository, pullRequests: prs }: { repository: BitBucketRepository; pullRequests: BitBucketPullRequest[] }) =>
        prs
          .filter((pr) => pr.state === "MERGED" || pr.merged === true)
          .map((pr) => ({ pr, repository }))
    );
  }, [pullRequests]);

  const usersInGroup = useMemo(() => {
    if (!selectedGroup) return [];
    const group = userGroups.find((g) => g.id === selectedGroup);
    return group ? group.users : [];
  }, [selectedGroup, userGroups]);

  const filteredPRs = useMemo(() => {
    let filtered = allMergedPRs;

    if (usersInGroup.length > 0) {
      filtered = filtered.filter(({ pr }) =>
        usersInGroup.includes(getAuthorName(pr))
      );
    }

    if (dateRange?.[0] || dateRange?.[1]) {
      const [start, end] = dateRange!;
      filtered = filtered.filter(({ pr }) => {
        if (!pr.closedDate) return false;
        const merged = dayjs(pr.closedDate);
        if (start && merged.isBefore(start, "day")) return false;
        if (end && merged.isAfter(end, "day")) return false;
        return true;
      });
    }

    return filtered;
  }, [allMergedPRs, usersInGroup, dateRange]);

  const cycleTimes = useMemo(
    () =>
      filteredPRs
        .map(({ pr }) => getCycleTimeDays(pr))
        .filter((d): d is number => d !== null),
    [filteredPRs]
  );

  const avgCycleTime = cycleTimes.length
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
    : null;

  const medianCycleTime = cycleTimes.length ? median(cycleTimes) : null;

  const tableData: PRRow[] = useMemo(
    () =>
      filteredPRs
        .map(({ pr, repository }, index) => ({
          key: index,
          title: pr.title,
          link: pr.links?.html?.href || pr.links?.self?.[0]?.href,
          author: getAuthorName(pr),
          repository: repository.full_name || repository.name || "Unknown",
          createdDate: pr.createdDate,
          mergedDate: pr.closedDate,
          cycleTime: getCycleTimeDays(pr),
        }))
        .sort((a, b) => (b.mergedDate ?? 0) - (a.mergedDate ?? 0)),
    [filteredPRs]
  );

  // Group management handlers
  const handleManageGroups = () => setIsGroupListModalVisible(true);

  const handleCreateGroup = () => {
    setEditingGroup(null);
    groupForm.resetFields();
    setIsGroupListModalVisible(false);
    setIsGroupModalVisible(true);
  };

  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    groupForm.setFieldsValue({ name: group.name, users: group.users });
    setIsGroupListModalVisible(false);
    setIsGroupModalVisible(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await saveGroups(userGroups.filter((g) => g.id !== groupId));
      if (selectedGroup === groupId) setSelectedGroup(null);
    } catch {
      message.error("Failed to delete group");
    }
  };

  const handleSaveGroup = () => {
    groupForm.validateFields().then(async (values) => {
      try {
        if (editingGroup) {
          await saveGroups(
            userGroups.map((g) =>
              g.id === editingGroup.id
                ? { ...g, name: values.name, users: values.users || [] }
                : g
            )
          );
          message.success("Group updated successfully");
        } else {
          const newGroup: UserGroup = {
            id: Date.now().toString(),
            name: values.name,
            users: values.users || [],
          };
          await saveGroups([...userGroups, newGroup]);
          message.success("Group created successfully");
        }
        setIsGroupModalVisible(false);
        setEditingGroup(null);
        groupForm.resetFields();
      } catch {
        message.error("Failed to save group");
      }
    });
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalVisible(false);
    setEditingGroup(null);
    groupForm.resetFields();
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>BitBucket PR Cycle Time</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            onClick={() => handleLoadAll(false)}
            loading={isLoadingAllPRs || isLoading || !!pendingLoad}
            type="primary"
          >
            Load All PRs
          </Button>
          <Button
            onClick={() => handleLoadAll(true)}
            loading={isLoadingAllPRs || isLoading || !!pendingLoad}
            disabled={pullRequests.length === 0}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert message={error} type="error" style={{ marginBottom: 16 }} />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Space wrap align="start">
          <div>
            <Space wrap>
              <Select
                placeholder="Select a group"
                value={selectedGroup}
                onChange={setSelectedGroup}
                allowClear
                style={{ width: 260 }}
              >
                {userGroups.map((group) => (
                  <Option key={group.id} value={group.id}>
                    {group.name} ({group.users.length} users)
                  </Option>
                ))}
              </Select>
              <Button icon={<UserOutlined />} onClick={handleManageGroups}>
                Manage Groups
              </Button>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(dates) =>
                  setDateRange(dates as [Dayjs | null, Dayjs | null] | null)
                }
                allowClear
                placeholder={["Merge date from", "Merge date to"]}
              />
            </Space>
            {usersInGroup.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {usersInGroup.map((user) => (
                  <Tag key={user} style={{ marginBottom: 4 }}>{user}</Tag>
                ))}
              </div>
            )}
          </div>
        </Space>
      </Card>

      {cycleTimes.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Card>
              <Statistic title="Merged PRs" value={filteredPRs.length} />
            </Card>
          </Col>
          <Col>
            <Card>
              <Statistic
                title="Average Cycle Time"
                value={avgCycleTime !== null ? avgCycleTime.toFixed(1) : "—"}
                suffix="days"
              />
            </Card>
          </Col>
          <Col>
            <Card>
              <Statistic
                title="Median Cycle Time"
                value={medianCycleTime !== null ? medianCycleTime.toFixed(1) : "—"}
                suffix="days"
              />
            </Card>
          </Col>
        </Row>
      )}

      <Table<PRRow>
        dataSource={tableData}
        columns={columns}
        pagination={{ pageSize: 50, showSizeChanger: true }}
        size="small"
        locale={{
          emptyText:
            pullRequests.length === 0
              ? "Load PRs to see cycle time data"
              : "No merged PRs match the current filters",
        }}
      />

      {/* Create / Edit Group Modal */}
      <Modal
        title={editingGroup ? "Edit User Group" : "Create User Group"}
        open={isGroupModalVisible}
        onOk={handleSaveGroup}
        onCancel={handleCloseGroupModal}
        width={600}
        okText={editingGroup ? "Update" : "Create"}
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="name"
            label="Group Name"
            rules={[
              { required: true, message: "Please enter a group name" },
              {
                validator: (_, value) => {
                  if (!value || value.trim() === "") return Promise.resolve();
                  const exists = userGroups.find(
                    (g) =>
                      g.name.toLowerCase() === value.trim().toLowerCase() &&
                      g.id !== editingGroup?.id
                  );
                  return exists
                    ? Promise.reject(new Error("A group with this name already exists"))
                    : Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="Enter group name" />
          </Form.Item>
          <Form.Item
            name="users"
            label="Users in Group"
            rules={[
              {
                validator: (_, value) =>
                  value && value.length > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error("Please select at least one user")),
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select users for this group"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
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

      {/* Group List Modal */}
      <Modal
        title="Manage User Groups"
        open={isGroupListModalVisible}
        onCancel={() => setIsGroupListModalVisible(false)}
        footer={[
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreateGroup}>
            Create New Group
          </Button>,
          <Button key="close" onClick={() => setIsGroupListModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {userGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Text type="secondary">No user groups created yet.</Text>
            <br />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateGroup}
              style={{ marginTop: 16 }}
            >
              Create Your First Group
            </Button>
          </div>
        ) : (
          <List
            dataSource={userGroups}
            renderItem={(group) => (
              <List.Item
                actions={[
                  <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => handleEditGroup(group)}>
                    Edit
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="Delete this group?"
                    description="This action cannot be undone."
                    onConfirm={() => handleDeleteGroup(group.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={group.name}
                  description={`${group.users.length} user${group.users.length !== 1 ? "s" : ""}: ${group.users.join(", ")}`}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default BitBucketCycleTime;
