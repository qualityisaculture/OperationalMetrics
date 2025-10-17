import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  DatePicker,
  Select,
  Space,
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
  Tag,
  Tooltip,
  Spin,
} from "antd";
import {
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { LoadingIndicator } from "../../components";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface WorklogData {
  issueKey: string;
  worklogId: string;
  author: string;
  timeSpent: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string | any;
}

interface WorklogSummary {
  totalWorklogs: number;
  totalTimeSpentSeconds: number;
  totalTimeSpentHours: number;
  uniqueIssues: number;
  uniqueAuthors: number;
  worklogs: WorklogData[];
}

interface Props {
  projectKey: string;
  projectName: string;
  accounts: string[];
}

export const ProjectWorklogsSection: React.FC<Props> = ({
  projectKey,
  projectName,
  accounts,
}) => {
  console.log(`ProjectWorklogsSection received accounts:`, accounts);

  const [worklogData, setWorklogData] = useState<WorklogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<{
    year: number;
    month: number;
  }>(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  });

  const fetchWorklogData = async (
    account: string,
    year: number,
    month: number
  ) => {
    if (!account) {
      setError("Please select an account first");
      return;
    }

    console.log(
      `Fetching worklog data for account: ${account}, year: ${year}, month: ${month}, project: ${projectKey}`
    );
    setLoading(true);
    setError(null);

    try {
      const url = `/api/jiraReport/account/${encodeURIComponent(account)}/worklogs/${year}/${month}`;
      console.log(`Worklog API URL: ${url}`);

      const response = await fetch(url);
      console.log(`Worklog response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Raw worklog API response:`, result);

      const data = JSON.parse(result.data);
      console.log(`Parsed worklog data:`, data);

      if (data.error) {
        throw new Error(data.error);
      }

      setWorklogData(data);
    } catch (err) {
      console.error("Error fetching worklog data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch worklog data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const newDate = {
        year: date.year(),
        month: date.month() + 1,
      };
      setSelectedDate(newDate);
      if (selectedAccount) {
        fetchWorklogData(selectedAccount, newDate.year, newDate.month);
      }
    }
  };

  const handleAccountChange = (account: string) => {
    setSelectedAccount(account);
    if (account) {
      fetchWorklogData(account, selectedDate.year, selectedDate.month);
    }
  };

  const handleRefresh = () => {
    if (selectedAccount) {
      fetchWorklogData(selectedAccount, selectedDate.year, selectedDate.month);
    }
  };

  const formatTimeSpent = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const worklogColumns = [
    {
      title: "Issue",
      dataIndex: "issueKey",
      key: "issueKey",
      render: (issueKey: string) => (
        <a
          href={`/browse/${issueKey}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {issueKey}
        </a>
      ),
    },
    {
      title: "Author",
      dataIndex: "author",
      key: "author",
      render: (author: string) => (
        <Tag icon={<UserOutlined />} color="blue">
          {author}
        </Tag>
      ),
    },
    {
      title: "Time Spent",
      dataIndex: "timeSpentSeconds",
      key: "timeSpentSeconds",
      render: (seconds: number) => (
        <Text strong>{formatTimeSpent(seconds)}</Text>
      ),
      sorter: (a: WorklogData, b: WorklogData) =>
        a.timeSpentSeconds - b.timeSpentSeconds,
    },
    {
      title: "Date",
      dataIndex: "started",
      key: "started",
      render: (date: string) => formatDate(date),
      sorter: (a: WorklogData, b: WorklogData) =>
        new Date(a.started).getTime() - new Date(b.started).getTime(),
    },
    {
      title: "Comment",
      dataIndex: "comment",
      key: "comment",
      render: (comment: string | any) => {
        // Handle both string comments and rich text objects
        let commentText = "";
        if (typeof comment === "string") {
          commentText = comment;
        } else if (comment && typeof comment === "object") {
          // Extract text from rich text object (Atlassian Document Format)
          if (comment.content && Array.isArray(comment.content)) {
            commentText = comment.content
              .map((item: any) => {
                if (item.text) return item.text;
                if (item.content && Array.isArray(item.content)) {
                  return item.content
                    .map((subItem: any) => subItem.text || "")
                    .join("");
                }
                return "";
              })
              .join(" ");
          } else if (comment.text) {
            commentText = comment.text;
          }
        }

        return commentText ? (
          <Tooltip title={commentText}>
            <Text ellipsis style={{ maxWidth: 200 }}>
              {commentText}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">No comment</Text>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Account Worklogs
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Select
            placeholder="Select Account"
            value={selectedAccount}
            onChange={handleAccountChange}
            style={{ minWidth: 200 }}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={accounts.map((account) => ({
              value: account,
              label: account,
            }))}
            prefix={<TeamOutlined />}
          />
          <DatePicker
            picker="month"
            value={dayjs(new Date(selectedDate.year, selectedDate.month - 1))}
            onChange={handleDateChange}
            format="YYYY-MM"
          />
          <Button
            icon={<CalendarOutlined />}
            onClick={handleRefresh}
            loading={loading}
            disabled={!selectedAccount}
          >
            Refresh
          </Button>
        </Space>
      }
      style={{ marginBottom: "16px" }}
    >
      {loading && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px" }}>
            <Text>
              Loading worklog data for {selectedDate.year}-
              {selectedDate.month.toString().padStart(2, "0")}...
            </Text>
          </div>
        </div>
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: "16px" }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && !worklogData && (
        <Alert
          message="Select an Account and Month to View Worklogs"
          description="Choose an account from the dropdown and a month using the date picker above, then click 'Refresh' to load worklog data for that account and period."
          type="info"
          showIcon
        />
      )}

      {worklogData && !loading && (
        <>
          {/* Summary Statistics */}
          <Row gutter={16} style={{ marginBottom: "24px" }}>
            <Col span={4}>
              <Statistic
                title="Total Worklogs"
                value={worklogData.totalWorklogs}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Total Time"
                value={worklogData.totalTimeSpentHours}
                suffix="hours"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Total Days"
                value={
                  Math.round((worklogData.totalTimeSpentHours / 7.5) * 100) /
                  100
                }
                suffix="days"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Issues"
                value={worklogData.uniqueIssues}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Authors"
                value={worklogData.uniqueAuthors}
                prefix={<UserOutlined />}
              />
            </Col>
          </Row>

          {/* Worklogs Table */}
          {worklogData.worklogs.length > 0 ? (
            <Table
              dataSource={worklogData.worklogs}
              columns={worklogColumns}
              rowKey="worklogId"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} worklogs`,
              }}
              scroll={{ x: 800 }}
            />
          ) : (
            <Alert
              message="No Worklogs Found"
              description={`No worklogs were found for account "${selectedAccount}" in project ${projectName} for ${selectedDate.year}-${selectedDate.month.toString().padStart(2, "0")}.`}
              type="info"
              showIcon
            />
          )}
        </>
      )}
    </Card>
  );
};
