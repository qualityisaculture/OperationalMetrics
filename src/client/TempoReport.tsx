import React from "react";
import {
  Card,
  Typography,
  Space,
  Button,
  Alert,
  Spin,
  Table,
  Tag,
  Tooltip,
  List,
  Divider,
} from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
  BarChartOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Props {}

interface State {
  isLoading: boolean;
  accounts: any[];
  error: string | null;
  selectedAccount: any | null;
  worklogs: any[];
  worklogsLoading: boolean;
  worklogsError: string | null;
}

export default class TempoReport extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      accounts: [],
      error: null,
      selectedAccount: null,
      worklogs: [],
      worklogsLoading: false,
      worklogsError: null,
    };
  }

  componentDidMount() {
    this.fetchAccounts();
  }

  fetchAccounts = async () => {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/tempoAccounts", {
        // Add cache-busting headers to prevent caching
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const result = await response.json();

      if (response.ok) {
        const accounts = JSON.parse(result.data);
        this.setState({
          accounts,
          isLoading: false,
        });
      } else {
        this.setState({
          error: `API Error: ${result.message || "Unknown error"}`,
          isLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        error: `Network Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        isLoading: false,
      });
    }
  };

  fetchWorklogs = async (accountKey: string) => {
    this.setState({ worklogsLoading: true, worklogsError: null });

    try {
      const response = await fetch(`/api/tempoWorklogs/${accountKey}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const result = await response.json();

      if (response.ok) {
        const worklogs = JSON.parse(result.data);
        this.setState({
          worklogs,
          worklogsLoading: false,
        });
      } else {
        this.setState({
          worklogsError: `API Error: ${result.message || "Unknown error"}`,
          worklogsLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        worklogsError: `Network Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        worklogsLoading: false,
      });
    }
  };

  handleAccountClick = (account: any) => {
    this.setState({
      selectedAccount: account,
      worklogs: [],
      worklogsError: null,
    });
    this.fetchWorklogs(account.key);
  };

  handleBackToAccounts = () => {
    this.setState({
      selectedAccount: null,
      worklogs: [],
      worklogsError: null,
    });
  };

  formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString();
  };

  getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "green";
      case "INACTIVE":
        return "red";
      case "PENDING":
        return "orange";
      default:
        return "default";
    }
  };

  render() {
    const {
      isLoading,
      accounts,
      error,
      selectedAccount,
      worklogs,
      worklogsLoading,
      worklogsError,
    } = this.state;

    const accountsColumns = [
      {
        title: "Account Key",
        dataIndex: "key",
        key: "key",
        render: (text: string) => <Text strong>{text}</Text>,
        sorter: (a: any, b: any) => a.key.localeCompare(b.key),
        defaultSortOrder: "ascend" as const,
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        render: (text: string) => <Text>{text}</Text>,
        sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }: FilterDropdownProps) => (
          <div style={{ padding: 8 }}>
            <input
              placeholder="Search name"
              value={String(selectedKeys[0] || "")}
              onChange={(e) =>
                setSelectedKeys(e.target.value ? [e.target.value] : [])
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" || e.keyCode === 13) {
                  confirm();
                }
              }}
              style={{ width: 188, marginBottom: 8, display: "block" }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
              <Button
                onClick={() => {
                  if (clearFilters) {
                    clearFilters();
                  }
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        ),
        filterIcon: (filtered) => (
          <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
        onFilter: (value: string, record: any) =>
          record.name.toLowerCase().includes(value.toLowerCase()),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: string) => (
          <Tag color={this.getStatusColor(status)}>
            {status?.toUpperCase() || "UNKNOWN"}
          </Tag>
        ),
        filters: [
          { text: "Active", value: "ACTIVE" },
          { text: "Inactive", value: "INACTIVE" },
          { text: "Pending", value: "PENDING" },
        ],
        onFilter: (value: string, record: any) =>
          record.status?.toUpperCase() === value,
      },
      {
        title: "Category",
        dataIndex: "category",
        key: "category",
        render: (text: string) => <Text>{text || "N/A"}</Text>,
        filters: [
          { text: "Development", value: "Development" },
          { text: "Support", value: "Support" },
          { text: "Research", value: "Research" },
        ],
        onFilter: (value: string, record: any) => record.category === value,
      },
      {
        title: "Customer",
        dataIndex: "customer",
        key: "customer",
        render: (text: string) => <Text>{text || "N/A"}</Text>,
        sorter: (a: any, b: any) =>
          (a.customer || "").localeCompare(b.customer || ""),
      },
      {
        title: "Lead",
        dataIndex: "lead",
        key: "lead",
        render: (text: string) => <Text>{text || "N/A"}</Text>,
        sorter: (a: any, b: any) => (a.lead || "").localeCompare(b.lead || ""),
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (text: string) =>
          text ? (
            <Tooltip title={text}>
              <Text
                style={{
                  maxWidth: "200px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {text}
              </Text>
            </Tooltip>
          ) : (
            <Text type="secondary">No description</Text>
          ),
      },
    ];

    const worklogsColumns = [
      {
        title: "Issue ID",
        dataIndex: ["issue", "id"],
        key: "issueId",
        render: (issueId: number) => <Text strong>{issueId || "N/A"}</Text>,
        sorter: (a: any, b: any) => (a.issue?.id || 0) - (b.issue?.id || 0),
      },
      {
        title: "Time Spent",
        dataIndex: "timeSpentSeconds",
        key: "timeSpent",
        render: (seconds: number) => (
          <Text type="success">
            <ClockCircleOutlined style={{ marginRight: "4px" }} />
            {this.formatTimeSpent(seconds)}
          </Text>
        ),
        sorter: (a: any, b: any) => a.timeSpentSeconds - b.timeSpentSeconds,
        defaultSortOrder: "descend" as const,
      },
      {
        title: "Billable Time",
        dataIndex: "billableSeconds",
        key: "billableTime",
        render: (seconds: number) =>
          seconds > 0 ? (
            <Text type="warning">{this.formatTimeSpent(seconds)}</Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
        sorter: (a: any, b: any) => a.billableSeconds - b.billableSeconds,
      },
      {
        title: "Author",
        dataIndex: ["author", "accountId"],
        key: "author",
        render: (accountId: string) => (
          <Text>
            <UserOutlined style={{ marginRight: "4px" }} />
            {accountId || "N/A"}
          </Text>
        ),
        sorter: (a: any, b: any) =>
          (a.author?.accountId || "").localeCompare(b.author?.accountId || ""),
      },
      {
        title: "Date",
        dataIndex: "startDate",
        key: "date",
        render: (date: string) => (
          <Text>
            <CalendarOutlined style={{ marginRight: "4px" }} />
            {this.formatDate(date)}
          </Text>
        ),
        sorter: (a: any, b: any) => a.startDate.localeCompare(b.startDate),
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (text: string) =>
          text ? (
            <Tooltip title={text}>
              <Text
                style={{
                  maxWidth: "200px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {text}
              </Text>
            </Tooltip>
          ) : (
            <Text type="secondary">No description</Text>
          ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (dateTime: string) => (
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {this.formatDateTime(dateTime)}
          </Text>
        ),
      },
    ];

    return (
      <div style={{ padding: "20px" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Title level={3}>
                <BarChartOutlined style={{ marginRight: "8px" }} />
                Tempo Report
              </Title>
              <Text type="secondary">
                View and analyze Tempo data including accounts, worklogs, and
                more
              </Text>
            </div>

            {!selectedAccount ? (
              // Accounts View
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <Space>
                    <Title level={4} style={{ margin: 0 }}>
                      Accounts
                    </Title>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={this.fetchAccounts}
                      loading={isLoading}
                    >
                      Refresh
                    </Button>
                    {accounts.length > 0 && (
                      <Text type="secondary">
                        <InfoCircleOutlined style={{ marginRight: "4px" }} />
                        {accounts.length} account
                        {accounts.length !== 1 ? "s" : ""} found
                      </Text>
                    )}
                  </Space>
                </div>

                {isLoading && (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Spin size="large" />
                    <div style={{ marginTop: "16px" }}>
                      <Text>Loading accounts...</Text>
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
                  />
                )}

                {!isLoading && !error && accounts.length > 0 && (
                  <Table
                    columns={accountsColumns}
                    dataSource={accounts}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} accounts`,
                    }}
                    size="middle"
                    scroll={{ x: true }}
                    onRow={(record) => ({
                      onClick: () => this.handleAccountClick(record),
                      style: { cursor: "pointer" },
                    })}
                  />
                )}

                {!isLoading && !error && accounts.length === 0 && (
                  <Alert
                    message="No Accounts Found"
                    description="No accounts were returned from the Tempo API."
                    type="info"
                    showIcon
                  />
                )}
              </div>
            ) : (
              // Worklogs View
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={this.handleBackToAccounts}
                    style={{ marginRight: "16px" }}
                  >
                    Back to Accounts
                  </Button>
                  <Title level={4} style={{ margin: 0, flex: 1 }}>
                    <ClockCircleOutlined style={{ marginRight: "8px" }} />
                    Worklogs for {selectedAccount.name} ({selectedAccount.key})
                  </Title>
                </div>

                {worklogsLoading && (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Spin size="large" />
                    <div style={{ marginTop: "16px" }}>
                      <Text>Loading worklogs...</Text>
                    </div>
                  </div>
                )}

                {worklogsError && (
                  <Alert
                    message="Error"
                    description={worklogsError}
                    type="error"
                    showIcon
                    style={{ marginBottom: "16px" }}
                  />
                )}

                {!worklogsLoading && !worklogsError && worklogs.length > 0 && (
                  <Table
                    columns={worklogsColumns}
                    dataSource={worklogs}
                    rowKey="tempoWorklogId"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} worklogs`,
                    }}
                    size="middle"
                    scroll={{ x: true }}
                  />
                )}

                {!worklogsLoading &&
                  !worklogsError &&
                  worklogs.length === 0 && (
                    <Alert
                      message="No Worklogs Found"
                      description="No worklogs were found for this account."
                      type="info"
                      showIcon
                    />
                  )}
              </div>
            )}
          </Space>
        </Card>
      </div>
    );
  }
}
