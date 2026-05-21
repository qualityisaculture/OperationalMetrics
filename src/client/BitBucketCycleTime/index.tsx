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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useBitBucketRepositories } from "../BitBucketPRs/hooks/useBitBucketRepositories";
import {
  BitBucketPullRequest,
  BitBucketRepository, // used in flatMap type annotation
} from "../../server/BitBucketRequester";
import { useBitBucketGroups } from "../Dashboard/hooks/useBitBucketGroups";

const { Title } = Typography;
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

  const [pendingLoad, setPendingLoad] = useState<{ refresh: boolean } | null>(null);

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

  const { groups: userGroups } = useBitBucketGroups();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);

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
          repository:
            repository.full_name || repository.name || "Unknown",
          createdDate: pr.createdDate,
          mergedDate: pr.closedDate,
          cycleTime: getCycleTimeDays(pr),
        }))
        .sort((a, b) => (b.mergedDate ?? 0) - (a.mergedDate ?? 0)),
    [filteredPRs]
  );

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
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) =>
              setDateRange(dates as [Dayjs | null, Dayjs | null] | null)
            }
            allowClear
            placeholder={["Merge date from", "Merge date to"]}
          />
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
                value={
                  medianCycleTime !== null ? medianCycleTime.toFixed(1) : "—"
                }
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
        locale={{ emptyText: pullRequests.length === 0 ? "Load PRs to see cycle time data" : "No merged PRs match the current filters" }}
      />
    </div>
  );
};

export default BitBucketCycleTime;
