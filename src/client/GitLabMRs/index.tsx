import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Form,
  Popconfirm,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useGitLabProjects } from "./hooks/useGitLabProjects";
import {
  GitLabProject,
  GitLabMergeRequest,
} from "../../server/GitLabRequester";
import {
  useBitBucketGroups,
  UserGroup,
} from "../Dashboard/hooks/useBitBucketGroups";

const { Title, Text } = Typography;
const { Option } = Select;

interface UserMRsTableProps {
  user: string;
  allMRs: GitLabMergeRequest[];
  mrColumns: any[];
}

const UserMRsTable: React.FC<UserMRsTableProps> = ({
  user,
  allMRs,
  mrColumns,
}) => {
  const userMRs = useMemo(() => {
    const filtered = allMRs.filter((mr) => {
      const authorName = mr.author?.name || "Unknown";
      return authorName === user;
    });
    return filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [allMRs, user]);

  if (userMRs.length === 0) {
    return <Text type="secondary">No merge requests found for {user}.</Text>;
  }

  return (
    <div>
      <Text type="secondary" style={{ marginBottom: "16px", display: "block" }}>
        Showing {userMRs.length} merge request
        {userMRs.length !== 1 ? "s" : ""} by {user} (newest first)
      </Text>
      <Table
        dataSource={userMRs}
        columns={mrColumns}
        rowKey={(record, index) => `${record.id || index}`}
        pagination={{ pageSize: 50 }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
};

const GitLabMRs: React.FC = () => {
  const {
    state,
    loadProjects,
    setGroup,
    loadMergeRequestsForProject,
    setSelectedProject,
    loadMergeRequestsForAllProjects,
  } = useGitLabProjects();

  const {
    projects,
    isLoading,
    error,
    group,
    mergeRequests,
    isLoadingMRs,
    mrsError,
    loadingProjectId,
    selectedProject,
    mrsLastUpdated,
    isLoadingAllMRs,
    projectProgress,
  } = state;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);
  const [selectedProjectsFilter, setSelectedProjectsFilter] = useState<
    string[]
  >([]);

  const { groups: userGroups, saveGroups } = useBitBucketGroups();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [isGroupListModalVisible, setIsGroupListModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupForm] = Form.useForm();

  const [selectedAuthorsForTable, setSelectedAuthorsForTable] = useState<
    string[]
  >([]);
  const [selectedGroupForTable, setSelectedGroupForTable] = useState<
    string | null
  >(null);
  const [selectedNamespacesForTable, setSelectedNamespacesForTable] = useState<
    string[]
  >([]);

  const getNamespaceFromProject = useCallback(
    (project: GitLabProject): string => {
      return project.namespace?.name || project.path_with_namespace.split("/")[0] || "Unknown";
    },
    []
  );

  const mrToProjectMap = useMemo(() => {
    const map = new Map<GitLabMergeRequest, GitLabProject>();
    mergeRequests.forEach((projectData) => {
      projectData.mergeRequests.forEach((mr) => {
        map.set(mr, projectData.project);
      });
    });
    return map;
  }, [mergeRequests]);

  const allMRs = useMemo(() => {
    return mergeRequests.flatMap((projectData) => projectData.mergeRequests);
  }, [mergeRequests]);

  const uniqueAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    allMRs.forEach((mr) => {
      const authorName = mr.author?.name || "Unknown";
      if (authorName) authorSet.add(authorName);
    });
    return Array.from(authorSet).sort();
  }, [allMRs]);

  const uniqueNamespaces = useMemo(() => {
    const nsSet = new Set<string>();
    projects.forEach((p) => {
      const ns = getNamespaceFromProject(p);
      if (ns && ns !== "Unknown") nsSet.add(ns);
    });
    mergeRequests.forEach((pd) => {
      const ns = getNamespaceFromProject(pd.project);
      if (ns && ns !== "Unknown") nsSet.add(ns);
    });
    return Array.from(nsSet).sort();
  }, [projects, mergeRequests, getNamespaceFromProject]);

  const uniqueProjectsInMRs = useMemo(() => {
    const projectMap = new Map<
      string,
      { id: number; name: string; path_with_namespace: string }
    >();
    mergeRequests.forEach((pd) => {
      const key = String(pd.project.id);
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          id: pd.project.id,
          name: pd.project.name,
          path_with_namespace: pd.project.path_with_namespace,
        });
      }
    });
    projects.forEach((p) => {
      const key = String(p.id);
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          id: p.id,
          name: p.name,
          path_with_namespace: p.path_with_namespace,
        });
      }
    });
    return Array.from(projectMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [projects, mergeRequests]);

  const usersInSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];
    const g = userGroups.find((g) => g.id === selectedGroup);
    return g ? g.users : [];
  }, [selectedGroup, userGroups]);

  const teamMemberCount = useMemo(() => {
    if (selectedGroup) return usersInSelectedGroup.length;
    if (selectedAuthors.length > 0) return selectedAuthors.length;
    return uniqueAuthors.length;
  }, [
    selectedGroup,
    selectedAuthors.length,
    usersInSelectedGroup.length,
    uniqueAuthors.length,
  ]);

  const usersInSelectedGroupForTable = useMemo(() => {
    if (!selectedGroupForTable) return [];
    const g = userGroups.find((g) => g.id === selectedGroupForTable);
    return g ? g.users : [];
  }, [selectedGroupForTable, userGroups]);

  const filteredMRs = useMemo(() => {
    let filtered = allMRs;

    if (selectedProjectsFilter.length > 0) {
      filtered = filtered.filter((mr) => {
        const project = mrToProjectMap.get(mr);
        if (!project) return false;
        return selectedProjectsFilter.includes(String(project.id));
      });
    }

    if (selectedNamespaces.length > 0) {
      filtered = filtered.filter((mr) => {
        const project = mrToProjectMap.get(mr);
        if (!project) return false;
        const ns = getNamespaceFromProject(project);
        return selectedNamespaces.includes(ns);
      });
    }

    const usersToFilter = selectedGroup
      ? usersInSelectedGroup
      : selectedAuthors;
    if (usersToFilter.length > 0) {
      filtered = filtered.filter((mr) => {
        const authorName = mr.author?.name || "Unknown";
        return usersToFilter.includes(authorName);
      });
    }

    return filtered;
  }, [
    allMRs,
    selectedAuthors,
    selectedGroup,
    usersInSelectedGroup,
    selectedNamespaces,
    selectedProjectsFilter,
    mrToProjectMap,
    getNamespaceFromProject,
  ]);

  const mrsByMonth = useMemo(() => {
    const monthMap = new Map<
      string,
      { label: string; count: number; sortKey: string }
    >();

    filteredMRs.forEach((mr) => {
      if (mr.state !== "merged") return;

      const dateStr = mr.merged_at;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.count += 1;
      } else {
        monthMap.set(monthKey, { label: monthLabel, count: 1, sortKey: monthKey });
      }
    });

    const entries = Array.from(monthMap.entries());
    entries.sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey));
    return entries.map(([monthKey, { label, count }]) => ({
      month: label,
      count,
      monthKey,
    }));
  }, [filteredMRs]);

  const getMRCountForProject = useMemo(() => {
    return (record: GitLabProject): number => {
      const projectData = mergeRequests.find(
        (r) => r.project.id === record.id
      );
      if (!projectData) return 0;

      const usersToFilter = selectedGroupForTable
        ? usersInSelectedGroupForTable
        : selectedAuthorsForTable;

      if (usersToFilter.length === 0) {
        return projectData.mergeRequests.length;
      }

      return projectData.mergeRequests.filter((mr) => {
        const authorName = mr.author?.name || "Unknown";
        return usersToFilter.includes(authorName);
      }).length;
    };
  }, [
    mergeRequests,
    selectedGroupForTable,
    selectedAuthorsForTable,
    usersInSelectedGroupForTable,
  ]);

  const filteredProjects = useMemo(() => {
    const usersToFilter = selectedGroupForTable
      ? usersInSelectedGroupForTable
      : selectedAuthorsForTable;

    let filtered = projects;

    if (selectedNamespacesForTable.length > 0) {
      filtered = filtered.filter((p) => {
        const ns = getNamespaceFromProject(p);
        return selectedNamespacesForTable.includes(ns);
      });
    }

    if (usersToFilter.length === 0) return filtered;

    return filtered.filter((p) => getMRCountForProject(p) > 0);
  }, [
    projects,
    selectedGroupForTable,
    selectedAuthorsForTable,
    selectedNamespacesForTable,
    usersInSelectedGroupForTable,
    getMRCountForProject,
    getNamespaceFromProject,
  ]);

  const projectColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: GitLabProject) => (
        <a href={record.web_url} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ),
    },
    {
      title: "Namespace",
      key: "namespace",
      render: (_: any, record: GitLabProject) =>
        getNamespaceFromProject(record),
    },
    {
      title: "Path",
      dataIndex: "path_with_namespace",
      key: "path_with_namespace",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string | null) => text || "-",
    },
    {
      title: "Visibility",
      dataIndex: "visibility",
      key: "visibility",
      render: (v: string) => (
        <Tag color={v === "public" ? "green" : v === "internal" ? "blue" : "default"}>
          {v}
        </Tag>
      ),
    },
    {
      title: "Number of MRs",
      key: "mrCount",
      sorter: (a: GitLabProject, b: GitLabProject) =>
        getMRCountForProject(a) - getMRCountForProject(b),
      render: (_: any, record: GitLabProject) => (
        <Text strong>{getMRCountForProject(record)}</Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: GitLabProject) => {
        const isThisProjectLoading = loadingProjectId === record.id;
        const projectData = mergeRequests.find(
          (r) => r.project.id === record.id
        );
        const hasLoadedMRs = projectData !== undefined;
        const mrCount = projectData?.mergeRequests.length || 0;

        return (
          <Space>
            <Button
              size="small"
              type={hasLoadedMRs ? "default" : "primary"}
              onClick={() =>
                loadMergeRequestsForProject(record, hasLoadedMRs)
              }
              loading={isThisProjectLoading}
            >
              {hasLoadedMRs ? "Refresh MRs" : "Request MRs"}
            </Button>
            {hasLoadedMRs && (
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setSelectedProject(record);
                  setIsModalVisible(true);
                }}
                disabled={mrCount === 0}
              >
                View MRs ({mrCount})
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const selectedProjectMRs = useMemo(() => {
    if (selectedProject) {
      return (
        mergeRequests.find((r) => r.project.id === selectedProject.id)
          ?.mergeRequests || []
      );
    }
    return [];
  }, [selectedProject, mergeRequests]);

  const selectedMonthMRs = useMemo(() => {
    if (!selectedMonth) return [];
    return filteredMRs.filter((mr) => {
      if (mr.state !== "merged" || !mr.merged_at) return false;
      const date = new Date(mr.merged_at);
      if (isNaN(date.getTime())) return false;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return monthKey === selectedMonth;
    });
  }, [selectedMonth, filteredMRs]);

  const mrColumns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: GitLabMergeRequest) => (
        <a href={record.web_url} target="_blank" rel="noopener noreferrer">
          !{record.iid} {text}
        </a>
      ),
    },
    {
      title: "Author",
      key: "author",
      render: (_: any, record: GitLabMergeRequest) =>
        record.author?.name || "Unknown",
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (state: string) => (
        <Tag
          color={
            state === "merged"
              ? "blue"
              : state === "opened"
              ? "green"
              : "default"
          }
        >
          {state.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Merged",
      key: "merged_at",
      render: (_: any, record: GitLabMergeRequest) => {
        if (!record.merged_at) return "-";
        return new Date(record.merged_at).toLocaleDateString();
      },
    },
    {
      title: "Created",
      key: "created_at",
      render: (_: any, record: GitLabMergeRequest) => {
        if (!record.created_at) return "-";
        return new Date(record.created_at).toLocaleDateString();
      },
    },
  ];

  // Group management handlers (same as BitBucket screen)
  const handleSaveGroup = useCallback(
    async (values: { name: string; users: string }) => {
      try {
        const userList = values.users
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0);

        let updatedGroups: UserGroup[];
        if (editingGroup) {
          updatedGroups = userGroups.map((g) =>
            g.id === editingGroup.id
              ? { ...g, name: values.name, users: userList }
              : g
          );
        } else {
          const newGroup: UserGroup = {
            id: `group-${Date.now()}`,
            name: values.name,
            users: userList,
          };
          updatedGroups = [...userGroups, newGroup];
        }

        await saveGroups(updatedGroups);
        message.success(
          editingGroup ? "Group updated successfully" : "Group created successfully"
        );
        setIsGroupModalVisible(false);
        groupForm.resetFields();
        setEditingGroup(null);
      } catch (error) {
        message.error("Failed to save group");
      }
    },
    [editingGroup, userGroups, saveGroups, groupForm]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      try {
        const updatedGroups = userGroups.filter((g) => g.id !== groupId);
        await saveGroups(updatedGroups);
        message.success("Group deleted successfully");
        if (selectedGroup === groupId) setSelectedGroup(null);
        if (selectedGroupForTable === groupId) setSelectedGroupForTable(null);
      } catch (error) {
        message.error("Failed to delete group");
      }
    },
    [userGroups, saveGroups, selectedGroup, selectedGroupForTable]
  );

  const handleEditGroup = useCallback(
    (groupToEdit: UserGroup) => {
      setEditingGroup(groupToEdit);
      groupForm.setFieldsValue({
        name: groupToEdit.name,
        users: groupToEdit.users.join("\n"),
      });
      setIsGroupModalVisible(true);
    },
    [groupForm]
  );

  // Track progress modal auto-open
  useEffect(() => {
    if (isLoadingAllMRs) {
      setIsProgressModalVisible(true);
    }
  }, [isLoadingAllMRs]);

  const progressEntries = useMemo(() => {
    return Array.from(projectProgress.entries()).map(([id, progress]) => ({
      id,
      ...progress,
    }));
  }, [projectProgress]);

  const completedCount = progressEntries.filter(
    (p) => p.status === "completed" || p.status === "error"
  ).length;
  const totalCount = progressEntries.length;

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>GitLab Merge Requests</Title>

      {/* Group input */}
      <Card style={{ marginBottom: "16px" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Title level={4}>GitLab Group</Title>
          <Space>
            <Input
              placeholder="Enter GitLab group path (e.g. my-org)"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              style={{ width: "400px" }}
              onPressEnter={loadProjects}
            />
            <Button
              type="primary"
              onClick={loadProjects}
              loading={isLoading}
              disabled={!group.trim()}
            >
              Load Projects
            </Button>
          </Space>
          {error && (
            <Alert message={error} type="error" showIcon closable />
          )}
        </Space>
      </Card>

      {/* Projects table */}
      {projects.length > 0 && (
        <Card style={{ marginBottom: "16px" }}>
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: "16px" }}
          >
            <Space wrap>
              <Title level={4} style={{ margin: 0 }}>
                Projects ({projects.length})
              </Title>
              <Button
                type="primary"
                onClick={() => loadMergeRequestsForAllProjects(false)}
                loading={isLoadingAllMRs}
                disabled={projects.length === 0}
              >
                Load All MRs
              </Button>
              {mergeRequests.length > 0 && (
                <Button
                  onClick={() => loadMergeRequestsForAllProjects(true)}
                  loading={isLoadingAllMRs}
                >
                  Refresh All MRs
                </Button>
              )}
              {mrsLastUpdated && (
                <Text type="secondary">
                  Last updated:{" "}
                  {new Date(mrsLastUpdated).toLocaleTimeString()}
                </Text>
              )}
              <Button
                icon={<UserOutlined />}
                onClick={() => setIsGroupListModalVisible(true)}
              >
                Manage User Groups
              </Button>
            </Space>

            {/* Table filters */}
            <Space wrap>
              <Select
                placeholder="Filter by namespace"
                mode="multiple"
                style={{ minWidth: "200px" }}
                value={selectedNamespacesForTable}
                onChange={setSelectedNamespacesForTable}
                allowClear
              >
                {uniqueNamespaces.map((ns) => (
                  <Option key={ns} value={ns}>
                    {ns}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by group"
                style={{ minWidth: "180px" }}
                value={selectedGroupForTable}
                onChange={setSelectedGroupForTable}
                allowClear
              >
                {userGroups.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.name}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by author"
                mode="multiple"
                style={{ minWidth: "200px" }}
                value={selectedAuthorsForTable}
                onChange={setSelectedAuthorsForTable}
                allowClear
              >
                {uniqueAuthors.map((a) => (
                  <Option key={a} value={a}>
                    {a}
                  </Option>
                ))}
              </Select>
            </Space>
          </Space>

          {mrsError && (
            <Alert
              message={mrsError}
              type="error"
              showIcon
              style={{ marginBottom: "16px" }}
            />
          )}

          <Table
            dataSource={filteredProjects}
            columns={projectColumns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: true }}
            size="small"
          />
        </Card>
      )}

      {/* MR Analytics */}
      {allMRs.length > 0 && (
        <Card style={{ marginBottom: "16px" }}>
          <Title level={4}>Merge Request Analytics</Title>

          {/* Analytics filters */}
          <Space wrap style={{ marginBottom: "16px" }}>
            <Select
              placeholder="Filter by namespace"
              mode="multiple"
              style={{ minWidth: "200px" }}
              value={selectedNamespaces}
              onChange={setSelectedNamespaces}
              allowClear
            >
              {uniqueNamespaces.map((ns) => (
                <Option key={ns} value={ns}>
                  {ns}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by project"
              mode="multiple"
              style={{ minWidth: "200px" }}
              value={selectedProjectsFilter}
              onChange={setSelectedProjectsFilter}
              allowClear
            >
              {uniqueProjectsInMRs.map((p) => (
                <Option key={String(p.id)} value={String(p.id)}>
                  {p.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by group"
              style={{ minWidth: "180px" }}
              value={selectedGroup}
              onChange={setSelectedGroup}
              allowClear
            >
              {userGroups.map((g) => (
                <Option key={g.id} value={g.id}>
                  {g.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by author"
              mode="multiple"
              style={{ minWidth: "200px" }}
              value={selectedAuthors}
              onChange={setSelectedAuthors}
              allowClear
            >
              {uniqueAuthors.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Select>
          </Space>

          <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>
            Showing {filteredMRs.length} merged MRs
            {teamMemberCount > 0 &&
              ` across ${teamMemberCount} team member${teamMemberCount !== 1 ? "s" : ""}`}
          </Text>

          <Table
            dataSource={mrsByMonth}
            rowKey="monthKey"
            pagination={false}
            size="small"
            columns={[
              {
                title: "Month",
                dataIndex: "month",
                key: "month",
              },
              {
                title: "MRs Merged",
                dataIndex: "count",
                key: "count",
                render: (count: number) => <Text strong>{count}</Text>,
              },
              {
                title: "MRs per Member",
                key: "perMember",
                render: (_: any, record: { count: number }) => {
                  if (teamMemberCount === 0) return "-";
                  return (record.count / teamMemberCount).toFixed(1);
                },
              },
              {
                title: "Actions",
                key: "actions",
                render: (_: any, record: any) => (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setSelectedMonth(record.monthKey);
                      setIsModalVisible(true);
                    }}
                  >
                    View MRs
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Per-user MR view */}
      {allMRs.length > 0 && (
        <Card>
          <Title level={4}>MRs by User</Title>
          <Space style={{ marginBottom: "16px" }}>
            <Select
              placeholder="Select a user"
              style={{ width: "300px" }}
              value={selectedUser}
              onChange={setSelectedUser}
              allowClear
            >
              {uniqueAuthors.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Select>
          </Space>
          {selectedUser && (
            <UserMRsTable
              user={selectedUser}
              allMRs={allMRs}
              mrColumns={mrColumns}
            />
          )}
        </Card>
      )}

      {/* MR detail modal */}
      <Modal
        title={
          selectedMonth
            ? `Merge Requests — ${mrsByMonth.find((m) => m.monthKey === selectedMonth)?.month || selectedMonth}`
            : selectedProject
            ? `Merge Requests — ${selectedProject.name}`
            : "Merge Requests"
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedMonth(null);
        }}
        footer={null}
        width={900}
      >
        <Table
          dataSource={selectedMonth ? selectedMonthMRs : selectedProjectMRs}
          columns={mrColumns}
          rowKey={(record, index) => `${record.id || index}`}
          pagination={{ pageSize: 50 }}
          scroll={{ x: true }}
          size="small"
        />
      </Modal>

      {/* Progress modal */}
      <Modal
        title="Loading Merge Requests"
        open={isProgressModalVisible}
        onCancel={() => setIsProgressModalVisible(false)}
        footer={
          !isLoadingAllMRs && (
            <Button onClick={() => setIsProgressModalVisible(false)}>
              Close
            </Button>
          )
        }
        width={600}
      >
        <Progress
          percent={
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0
          }
          style={{ marginBottom: "16px" }}
        />
        <Text>
          {completedCount} / {totalCount} projects processed
        </Text>
        <List
          size="small"
          style={{ marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}
          dataSource={progressEntries}
          renderItem={(item) => (
            <List.Item>
              <Space>
                {item.status === "completed" && (
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                )}
                {item.status === "error" && (
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                )}
                {item.status === "loading" && (
                  <LoadingOutlined style={{ color: "#1890ff" }} />
                )}
                {item.status === "pending" && (
                  <span style={{ color: "#d9d9d9" }}>○</span>
                )}
                <Text>{item.project.path_with_namespace}</Text>
                {item.status === "completed" && (
                  <Text type="secondary">({item.mrCount} MRs)</Text>
                )}
                {item.status === "error" && (
                  <Text type="danger">{item.error}</Text>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      {/* Group list modal */}
      <Modal
        title="Manage User Groups"
        open={isGroupListModalVisible}
        onCancel={() => setIsGroupListModalVisible(false)}
        footer={null}
        width={600}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingGroup(null);
            groupForm.resetFields();
            setIsGroupModalVisible(true);
          }}
          style={{ marginBottom: "16px" }}
        >
          New Group
        </Button>
        <List
          dataSource={userGroups}
          renderItem={(g) => (
            <List.Item
              actions={[
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditGroup(g)}
                >
                  Edit
                </Button>,
                <Popconfirm
                  title={`Delete group "${g.name}"?`}
                  onConfirm={() => handleDeleteGroup(g.id)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button icon={<DeleteOutlined />} size="small" danger>
                    Delete
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={g.name}
                description={`${g.users.length} member${g.users.length !== 1 ? "s" : ""}: ${g.users.join(", ")}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Group create/edit modal */}
      <Modal
        title={editingGroup ? "Edit Group" : "Create Group"}
        open={isGroupModalVisible}
        onCancel={() => {
          setIsGroupModalVisible(false);
          groupForm.resetFields();
          setEditingGroup(null);
        }}
        footer={null}
      >
        <Form form={groupForm} layout="vertical" onFinish={handleSaveGroup}>
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: "Please enter a group name" }]}
          >
            <Input placeholder="e.g. Backend Team" />
          </Form.Item>
          <Form.Item
            name="users"
            label="Members (one per line, use GitLab display names)"
            rules={[{ required: true, message: "Please enter at least one member" }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="John Smith&#10;Jane Doe&#10;Alex Johnson"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingGroup ? "Save Changes" : "Create Group"}
              </Button>
              <Button
                onClick={() => {
                  setIsGroupModalVisible(false);
                  groupForm.resetFields();
                  setEditingGroup(null);
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GitLabMRs;
