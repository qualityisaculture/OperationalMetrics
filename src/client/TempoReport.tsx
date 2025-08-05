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
} from "antd";
import {
  BarChartOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Props {}

interface State {
  isLoading: boolean;
  accounts: any[];
  error: string | null;
}

export default class TempoReport extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      accounts: [],
      error: null,
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
    const { isLoading, accounts, error } = this.state;

    const columns = [
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

            <div>
              <Space style={{ marginBottom: "16px" }}>
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
                    {accounts.length} account{accounts.length !== 1 ? "s" : ""}{" "}
                    found
                  </Text>
                )}
              </Space>

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
                  columns={columns}
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
          </Space>
        </Card>
      </div>
    );
  }
}
