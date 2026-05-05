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
import { useBitBucketRepositories } from "./hooks/useBitBucketRepositories";
import {
  BitBucketRepository,
  BitBucketPullRequest,
} from "../../server/BitBucketRequester";
import {
  useBitBucketGroups,
  UserGroup,
} from "../Dashboard/hooks/useBitBucketGroups";

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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const { groups: userGroups, saveGroups } = useBitBucketGroups();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [isGroupListModalVisible, setIsGroupListModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupForm] = Form.useForm();
  // Filter state for main table
  const [selectedAuthorsForTable, setSelectedAuthorsForTable] = useState<
    string[]
  >([]);
  const [selectedGroupForTable, setSelectedGroupForTable] = useState<
    string | null
  >(null);
  const [selectedProjectsForTable, setSelectedProjectsForTable] = useState<
    string[]
  >([]);

  // Helper function to extract project from repository
  const getProjectFromRepository = useCallback(
    (repository: BitBucketRepository): string => {
      // Try project.key (BitBucket Server)
      if ((repository as any).project?.key) {
        return (repository as any).project.key;
      }
      // Try extracting from full_name (format: "project/repo" or "workspace/repo")
      if (repository.full_name) {
        const parts = repository.full_name.split("/");
        if (parts.length >= 2) {
          return parts[0];
        }
      }
      // Try extracting from self link URL
      const selfLink = repository.links?.self?.href;
      if (selfLink) {
        // Extract from URL like: /rest/api/2.0/repositories/{project}/{repo}
        const match = selfLink.match(/repositories\/([^\/]+)\/([^\/]+)/);
        if (match) {
          return match[1];
        }
        // Try API 1.0 format: /rest/api/1.0/projects/{project}/repos/{repo}
        const match1 = selfLink.match(/projects\/([^\/]+)\/repos\/([^\/]+)/);
        if (match1) {
          return match1[1];
        }
      }
      return "Unknown";
    },
    []
  );

  // Create a mapping from PR to repository for project filtering
  const prToRepositoryMap = useMemo(() => {
    const map = new Map<BitBucketPullRequest, BitBucketRepository>();
    pullRequests.forEach((repoData) => {
      repoData.pullRequests.forEach((pr) => {
        map.set(pr, repoData.repository);
      });
    });
    return map;
  }, [pullRequests]);

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

  // Helper function to get repository identifier
  const getRepoIdentifier = useCallback(
    (repository: BitBucketRepository): string => {
      return (
        repository.full_name || repository.uuid || repository.slug || "Unknown"
      );
    },
    []
  );

  // Extract unique projects from repositories (both from repositories state and pullRequests)
  const uniqueProjects = useMemo(() => {
    const projectSet = new Set<string>();

    // Get projects from repositories state
    repositories.forEach((repo) => {
      const project = getProjectFromRepository(repo);
      if (project && project !== "Unknown") {
        projectSet.add(project);
      }
    });

    // Also get projects from repositories in pullRequests (in case repositories state is empty)
    pullRequests.forEach((repoData) => {
      const project = getProjectFromRepository(repoData.repository);
      if (project && project !== "Unknown") {
        projectSet.add(project);
      }
    });

    return Array.from(projectSet).sort();
  }, [repositories, pullRequests, getProjectFromRepository]);

  // Extract unique repositories from pullRequests
  const uniqueRepos = useMemo(() => {
    const repoMap = new Map<string, { identifier: string; name: string }>();

    // Get repos from pullRequests
    pullRequests.forEach((repoData) => {
      const identifier = getRepoIdentifier(repoData.repository);
      const name =
        repoData.repository.full_name || repoData.repository.name || identifier;
      if (identifier && identifier !== "Unknown") {
        repoMap.set(identifier, { identifier, name });
      }
    });

    // Also get repos from repositories state
    repositories.forEach((repo) => {
      const identifier = getRepoIdentifier(repo);
      const name = repo.full_name || repo.name || identifier;
      if (identifier && identifier !== "Unknown" && !repoMap.has(identifier)) {
        repoMap.set(identifier, { identifier, name });
      }
    });

    return Array.from(repoMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [pullRequests, repositories, getRepoIdentifier]);

  // Get users from selected group
  const usersInSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];
    const group = userGroups.find((g) => g.id === selectedGroup);
    return group ? group.users : [];
  }, [selectedGroup, userGroups]);

  // Calculate team member count for PRs per team member calculation
  const teamMemberCount = useMemo(() => {
    if (selectedGroup) {
      // If a group is selected, use the number of users in that group
      return usersInSelectedGroup.length;
    } else if (selectedAuthors.length > 0) {
      // If individual authors are selected, use the count of selected authors
      return selectedAuthors.length;
    } else {
      // Default: use all unique authors
      return uniqueAuthors.length;
    }
  }, [
    selectedGroup,
    selectedAuthors.length,
    usersInSelectedGroup.length,
    uniqueAuthors.length,
  ]);

  // Get users from selected group for main table
  const usersInSelectedGroupForTable = useMemo(() => {
    if (!selectedGroupForTable) return [];
    const group = userGroups.find((g) => g.id === selectedGroupForTable);
    return group ? group.users : [];
  }, [selectedGroupForTable, userGroups]);

  // Filter PRs by selected authors, selected group, selected projects, and selected repos
  const filteredPRs = useMemo(() => {
    let filtered = allPRs;

    // Filter by repos first
    if (selectedRepos.length > 0) {
      filtered = filtered.filter((pr) => {
        const repository = prToRepositoryMap.get(pr);
        if (!repository) return false;
        const repoIdentifier = getRepoIdentifier(repository);
        return selectedRepos.includes(repoIdentifier);
      });
    }

    // Filter by projects
    if (selectedProjects.length > 0) {
      filtered = filtered.filter((pr) => {
        const repository = prToRepositoryMap.get(pr);
        if (!repository) return false;
        const project = getProjectFromRepository(repository);
        return selectedProjects.includes(project);
      });
    }

    // Then filter by authors or group
    const usersToFilter = selectedGroup
      ? usersInSelectedGroup
      : selectedAuthors;

    if (usersToFilter.length > 0) {
      filtered = filtered.filter((pr) => {
        const authorName =
          pr.author?.display_name ||
          pr.author?.user?.displayName ||
          pr.author?.user?.name ||
          "Unknown";
        return usersToFilter.includes(authorName);
      });
    }

    return filtered;
  }, [
    allPRs,
    selectedAuthors,
    selectedGroup,
    usersInSelectedGroup,
    selectedProjects,
    selectedRepos,
    prToRepositoryMap,
    getProjectFromRepository,
    getRepoIdentifier,
  ]);

  // Group PRs by month and count them (using merged/closed date)
  const prsByMonth = useMemo(() => {
    const monthMap = new Map<
      string,
      { label: string; count: number; commentCount: number; sortKey: string }
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

      const prComments = pr.properties?.commentCount ?? 0;
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.count += 1;
        existing.commentCount += prComments;
      } else {
        monthMap.set(monthKey, {
          label: monthLabel,
          count: 1,
          commentCount: prComments,
          sortKey: monthKey,
        });
      }
    });

    // Convert to array and sort by sortKey (which is YYYY-MM format)
    const entries = Array.from(monthMap.entries());
    entries.sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey));

    const rows = entries.map(([monthKey, { label, count, commentCount }]) => ({
      month: label,
      count,
      commentCount,
      monthKey,
    }));

    // Append open PRs row
    const openPRs = filteredPRs.filter((pr) => pr.state === "OPEN" || pr.open === true);
    if (openPRs.length > 0) {
      rows.push({
        month: "Open",
        count: openPRs.length,
        commentCount: openPRs.reduce((sum, pr) => sum + (pr.properties?.commentCount ?? 0), 0),
        monthKey: "__open__",
      });
    }

    return rows;
  }, [filteredPRs]);

  // Helper function to count PRs for a repository based on table filters
  const getPRCountForRepository = useMemo(() => {
    return (record: BitBucketRepository): number => {
      const repoId = record.full_name || record.uuid || record.slug;
      const repoPRs = pullRequests.find(
        (r) =>
          (r.repository.full_name || r.repository.uuid || r.repository.slug) ===
          repoId
      );

      if (!repoPRs) return 0;

      // If no filters are applied, return all PRs
      const usersToFilter = selectedGroupForTable
        ? usersInSelectedGroupForTable
        : selectedAuthorsForTable;

      if (usersToFilter.length === 0) {
        return repoPRs.pullRequests.length;
      }

      // Filter PRs by selected authors/group
      return repoPRs.pullRequests.filter((pr) => {
        const authorName =
          pr.author?.display_name ||
          pr.author?.user?.displayName ||
          pr.author?.user?.name ||
          "Unknown";
        return usersToFilter.includes(authorName);
      }).length;
    };
  }, [
    pullRequests,
    selectedGroupForTable,
    selectedAuthorsForTable,
    usersInSelectedGroupForTable,
  ]);

  // Filter repositories based on table filters (only show repos with matching PRs and projects)
  const filteredRepositories = useMemo(() => {
    const usersToFilter = selectedGroupForTable
      ? usersInSelectedGroupForTable
      : selectedAuthorsForTable;

    // First filter by project if any projects are selected
    let reposFilteredByProject = repositories;
    if (selectedProjectsForTable.length > 0) {
      reposFilteredByProject = repositories.filter((repo) => {
        const project = getProjectFromRepository(repo);
        return selectedProjectsForTable.includes(project);
      });
    }

    // Then filter by author/group if any are selected
    if (usersToFilter.length === 0) {
      return reposFilteredByProject;
    }

    // Only show repositories that have at least one PR from the selected authors/group
    return reposFilteredByProject.filter((repo) => {
      const prCount = getPRCountForRepository(repo);
      return prCount > 0;
    });
  }, [
    repositories,
    selectedGroupForTable,
    selectedAuthorsForTable,
    selectedProjectsForTable,
    usersInSelectedGroupForTable,
    getPRCountForRepository,
    getProjectFromRepository,
  ]);

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
      title: "Project",
      key: "project",
      render: (_: any, record: BitBucketRepository) => {
        return getProjectFromRepository(record);
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
      title: "Number of PRs",
      key: "prCount",
      sorter: (a: BitBucketRepository, b: BitBucketRepository) => {
        const countA = getPRCountForRepository(a);
        const countB = getPRCountForRepository(b);
        return countA - countB;
      },
      render: (_: any, record: BitBucketRepository) => {
        const prCount = getPRCountForRepository(record);
        return <Text strong>{prCount}</Text>;
      },
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

  // Get PRs for the selected repository or selected month
  const selectedRepoPRs = useMemo(() => {
    if (selectedRepository) {
      return (
        pullRequests.find(
          (r) =>
            (r.repository.full_name ||
              r.repository.uuid ||
              r.repository.slug) ===
            (selectedRepository.full_name ||
              selectedRepository.uuid ||
              selectedRepository.slug)
        )?.pullRequests || []
      );
    }
    if (selectedMonth === "__open__") {
      return filteredPRs.filter((pr) => pr.state === "OPEN" || pr.open === true);
    }
    if (selectedMonth) {
      // Filter PRs by the selected month
      return filteredPRs.filter((pr) => {
        // Only merged PRs
        const isMerged =
          pr.state === "MERGED" ||
          pr.merged === true ||
          (pr.closed === true && pr.state !== "DECLINED");

        if (!isMerged) {
          return false;
        }

        if (!pr.closedDate) {
          return false;
        }

        const date = new Date(pr.closedDate);
        if (isNaN(date.getTime())) {
          return false;
        }

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === selectedMonth;
      });
    }
    return [];
  }, [selectedRepository, selectedMonth, pullRequests, filteredPRs]);

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
    {
      title: "Comments",
      dataIndex: ["properties", "commentCount"],
      key: "comment_count",
      render: (count: number | undefined) => <Text strong>{count ?? 0}</Text>,
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

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedRepository(null);
    setSelectedMonth(null);
  };

  const handleViewPRsForMonth = (monthKey: string, monthLabel: string) => {
    setSelectedMonth(monthKey);
    setSelectedRepository(null);
    setIsModalVisible(true);
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
                {filteredRepositories.length !== repositories.length && (
                  <span>
                    {" "}
                    (showing {filteredRepositories.length} with matching PRs)
                  </span>
                )}
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
                  // If PRs have been loaded before, refresh (clear cache)
                  const hasLoadedPRs = pullRequests.length > 0;
                  await loadPullRequestsForAllRepositories(hasLoadedPRs);
                }}
                loading={isLoadingAllPRs}
                disabled={isLoadingAllPRs}
              >
                {pullRequests.length > 0
                  ? "Refresh All Repositories"
                  : "Load PRs for All Repositories"}
              </Button>
            </Space>

            {/* Filter controls for main table */}
            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: "16px" }}
            >
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Project:
                </Text>
                <Select
                  mode="multiple"
                  placeholder="Select projects (leave empty to show all)"
                  value={selectedProjectsForTable}
                  onChange={setSelectedProjectsForTable}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
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
                  {uniqueProjects.map((project) => (
                    <Option key={project} value={project} label={project}>
                      {project}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Group:
                </Text>
                <Select
                  placeholder="Select a group (or use individual authors below)"
                  value={selectedGroupForTable}
                  onChange={(value) => {
                    setSelectedGroupForTable(value);
                    setSelectedAuthorsForTable([]); // Clear individual author selection when group is selected
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
                  value={selectedAuthorsForTable}
                  onChange={(value) => {
                    setSelectedAuthorsForTable(value);
                    setSelectedGroupForTable(null); // Clear group selection when individual authors are selected
                  }}
                  style={{ width: "100%", maxWidth: "600px" }}
                  allowClear
                  showSearch
                  disabled={!!selectedGroupForTable}
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
              dataSource={filteredRepositories}
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
              <Button icon={<UserOutlined />} onClick={handleManageGroups}>
                Manage User Groups
              </Button>
            </Space>
            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: "20px" }}
            >
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Project:
                </Text>
                <Select
                  mode="multiple"
                  placeholder="Select projects (leave empty to show all)"
                  value={selectedProjects}
                  onChange={(value) => {
                    setSelectedProjects(value);
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
                  {uniqueProjects.map((project) => (
                    <Option key={project} value={project} label={project}>
                      {project}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text strong style={{ marginRight: "8px" }}>
                  Filter by Repo:
                </Text>
                <Select
                  mode="multiple"
                  placeholder="Select repos (leave empty to show all)"
                  value={selectedRepos}
                  onChange={(value) => {
                    setSelectedRepos(value);
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
                  {uniqueRepos.map((repo) => (
                    <Option
                      key={repo.identifier}
                      value={repo.identifier}
                      label={repo.name}
                    >
                      {repo.name}
                    </Option>
                  ))}
                </Select>
              </div>
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
                {selectedRepos.length > 0
                  ? ` from ${selectedRepos.length} selected repo${selectedRepos.length !== 1 ? "s" : ""}`
                  : ""}
                {selectedProjects.length > 0
                  ? ` from ${selectedProjects.length} selected project${selectedProjects.length !== 1 ? "s" : ""}`
                  : ""}
                {selectedGroup
                  ? ` from group "${userGroups.find((g) => g.id === selectedGroup)?.name || ""}"`
                  : selectedAuthors.length > 0
                    ? ` from ${selectedAuthors.length} selected author${selectedAuthors.length !== 1 ? "s" : ""}`
                    : selectedRepos.length === 0 &&
                      selectedProjects.length === 0 &&
                      " from all authors"}
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
                    {
                      title: "Comments",
                      dataIndex: "commentCount",
                      key: "commentCount",
                      render: (count: number) => <Text strong>{count}</Text>,
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (
                        _: any,
                        record: {
                          month: string;
                          count: number;
                          commentCount: number;
                          monthKey: string;
                        }
                      ) => (
                        <Button
                          size="small"
                          type="link"
                          onClick={() =>
                            handleViewPRsForMonth(record.monthKey, record.month)
                          }
                          disabled={record.count === 0}
                        >
                          View PRs
                        </Button>
                      ),
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
            ? `Pull Requests - ${selectedRepository.full_name || selectedRepository.name}`
            : selectedMonth
              ? `Pull Requests - ${prsByMonth.find((m) => m.monthKey === selectedMonth)?.month || selectedMonth}`
              : "Pull Requests"
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
        {(selectedRepository || selectedMonth) && (
          <div style={{ marginBottom: "16px" }}>
            <Text>
              Showing {selectedRepoPRs.length} pull request
              {selectedRepoPRs.length !== 1 ? "s" : ""}
              {selectedRepository
                ? ` for ${selectedRepository.full_name || selectedRepository.name}`
                : selectedMonth
                  ? ` for ${prsByMonth.find((m) => m.monthKey === selectedMonth)?.month || selectedMonth}`
                  : ""}
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

      {/* User Groups Management Modal */}
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
                  if (!value || value.trim() === "") {
                    return Promise.resolve();
                  }
                  const trimmedValue = value.trim();
                  const existingGroup = userGroups.find(
                    (g) =>
                      g.name.toLowerCase() === trimmedValue.toLowerCase() &&
                      g.id !== editingGroup?.id
                  );
                  if (existingGroup) {
                    return Promise.reject(
                      new Error("A group with this name already exists")
                    );
                  }
                  return Promise.resolve();
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
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(
                      new Error("Please select at least one user")
                    );
                  }
                  return Promise.resolve();
                },
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

      {/* User Groups List Modal */}
      <Modal
        title="Manage User Groups"
        open={isGroupListModalVisible}
        onCancel={handleCloseGroupListModal}
        footer={[
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateGroup}
          >
            Create New Group
          </Button>,
          <Button key="close" onClick={handleCloseGroupListModal}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {userGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Text type="secondary">No user groups created yet.</Text>
            <br />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsGroupListModalVisible(false);
                handleCreateGroup();
              }}
              style={{ marginTop: "16px" }}
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
                  <Button
                    key="edit"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEditGroup(group)}
                  >
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

export default BitBucketPRs;
