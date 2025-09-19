import React from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Typography,
  Button,
  Radio,
} from "antd";
import { BarChartOutlined, UserOutlined, BugOutlined } from "@ant-design/icons";
import { IssueDetail } from "../types";
import { useResizableColumns } from "../../components/tables/useResizableColumns";

const { Title, Text } = Typography;

interface DrilldownViewProps {
  analyzerState: any;
  handleBackToSummary: () => void;
  handleUserCategoryClick: (category: string) => void;
  showWorkDescriptions: (issueKey: string, descriptions: any[]) => void;
  handleViewModeChange: (mode: "name" | "issue" | "type" | "account") => void;
  handleIssueKeyClick: (issueKey: string) => void;
  handleBackToIssueView: () => void;
}

export const DrilldownView: React.FC<DrilldownViewProps> = ({
  analyzerState,
  handleBackToSummary,
  handleUserCategoryClick,
  showWorkDescriptions,
  handleViewModeChange,
  handleIssueKeyClick,
  handleBackToIssueView,
}) => {
  // Define columns for resizable functionality
  const userCategoryColumns = [
    {
      title: "Account Category",
      dataIndex: "category",
      key: "category",
      render: (text: any) => <Text strong>{text}</Text>,
    },
    {
      title: "Logged Hours",
      dataIndex: "hours",
      key: "hours",
      render: (text: any) => <Text>{text.toFixed(2)} hrs</Text>,
      sorter: (a: any, b: any) => a.hours - b.hours,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Logged Days",
      dataIndex: "chargeableDays",
      key: "chargeableDays",
      render: (text: any) => <Text>{text.toFixed(2)} days</Text>,
      sorter: (a: any, b: any) => a.chargeableDays - b.chargeableDays,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      render: (text: any) => <Text type="secondary">{text}%</Text>,
    },
  ];

  const { getResizableColumns: getUserCategoryResizableColumns } =
    useResizableColumns(userCategoryColumns);
  const resizableUserCategoryColumns =
    getUserCategoryResizableColumns(userCategoryColumns);

  // Define columns for user category issue data table
  const userCategoryIssueColumns = [
    {
      title: "Issue Key",
      dataIndex: "issueKey",
      key: "issueKey",
      render: (text: any) => (
        <a
          href={`https://lendscape.atlassian.net/browse/${text}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: "bold" }}
          onClick={(e: any) => e.stopPropagation()}
        >
          {text}
        </a>
      ),
    },
    {
      title: "Issue Type",
      dataIndex: "type",
      key: "type",
      render: (text: any) => <Text>{text}</Text>,
    },
    {
      title: "Issue Summary",
      dataIndex: "summary",
      key: "summary",
      render: (text: any) => (
        <Text
          style={{
            maxWidth: "200px",
            overflow: "clip",
            display: "block",
          }}
        >
          {text || "No summary"}
        </Text>
      ),
    },
    {
      title: "Work Description",
      key: "workDescription",
      render: (_: any, record: any) => {
        const descriptions =
          userCategoryIssueWorkDescriptions[record.issueKey] || [];
        return descriptions.length > 0 ? (
          <Button
            size="small"
            type="link"
            onClick={(e: any) => {
              e.stopPropagation();
              showWorkDescriptions(record.issueKey, descriptions);
            }}
          >
            View Descriptions ({descriptions.length})
          </Button>
        ) : (
          <Text type="secondary">No descriptions</Text>
        );
      },
    },
    {
      title: "Logged Hours",
      dataIndex: "hours",
      key: "hours",
      render: (text: any) => <Text>{text.toFixed(2)} hrs</Text>,
      sorter: (a: any, b: any) => a.hours - b.hours,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Logged Days",
      dataIndex: "chargeableDays",
      key: "chargeableDays",
      render: (text: any) => <Text>{text.toFixed(2)} days</Text>,
      sorter: (a: any, b: any) => a.chargeableDays - b.chargeableDays,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      render: (text: any) => <Text type="secondary">{text}%</Text>,
    },
  ];

  const { getResizableColumns: getUserCategoryIssueResizableColumns } =
    useResizableColumns(userCategoryIssueColumns);
  const resizableUserCategoryIssueColumns =
    getUserCategoryIssueResizableColumns(userCategoryIssueColumns);

  // Define columns for detailed data table (varies by viewMode)
  const getDetailedDataColumns = (viewMode: string) => {
    const baseColumns = [
      {
        title:
          viewMode === "name"
            ? "Full Name"
            : viewMode === "issue"
              ? "Issue Key"
              : viewMode === "account"
                ? "Account Name"
                : "Issue Type",
        dataIndex: "item",
        key: "item",
        render: (text: any) => {
          if (viewMode === "issue") {
            return (
              <a
                href={`https://lendscape.atlassian.net/browse/${text}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: "bold" }}
                onClick={(e: any) => e.stopPropagation()}
              >
                {text}
              </a>
            );
          }
          return <Text strong>{text}</Text>;
        },
      },
      ...(viewMode === "issue"
        ? [
            {
              title: "Issue Type",
              dataIndex: "type",
              key: "type",
              render: (text: any) => <Text>{text}</Text>,
            },
            {
              title: "Issue Summary",
              dataIndex: "summary",
              key: "summary",
              render: (text: any) => (
                <Text
                  style={{
                    maxWidth: "200px",
                    overflow: "clip",
                    display: "block", 
                  }}
                >
                  {text || "No summary"}
                </Text>
              ),
            },
            {
              title: "Work Description",
              key: "workDescription",
              render: (_: any, record: any) => {
                const descriptions = issueWorkDescriptions[record.item] || [];
                return descriptions.length > 0 ? (
                  <Button
                    size="small"
                    type="link"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      showWorkDescriptions(record.item, descriptions);
                    }}
                  >
                    View Descriptions ({descriptions.length})
                  </Button>
                ) : (
                  <Text type="secondary">No descriptions</Text>
                );
              },
            },
          ]
        : []),
      {
        title: "Logged Hours",
        dataIndex: "hours",
        key: "hours",
        render: (text: any) => <Text>{text.toFixed(2)} hrs</Text>,
        sorter: (a: any, b: any) => a.hours - b.hours,
        defaultSortOrder: "descend" as const,
      },
      {
        title: "Logged Days",
        dataIndex: "chargeableDays",
        key: "chargeableDays",
        render: (text: any) => <Text>{text.toFixed(2)} days</Text>,
        sorter: (a: any, b: any) => a.chargeableDays - b.chargeableDays,
      },
      {
        title: "Percentage",
        dataIndex: "percentage",
        key: "percentage",
        render: (text: any, record: any) => (
          <Text type="secondary">
            {text}%
            {record.isAccount &&
              record.subPercentage &&
              ` (${record.subPercentage}%)`}
          </Text>
        ),
      },
    ];
    return baseColumns;
  };

  const {
    selectedCategory,
    selectedUser,
    selectedUserCategory,
    userTotalHours,
    userCategoryData,
    userCategoryIssueTotal,
    userCategoryIssueData,
    userCategoryIssueDataWithType,
    userCategoryIssueWorkDescriptions,
    detailedByIssueWithType,
    detailedByType,
    issueWorkDescriptions,
    selectedIssueKey,
    issueUserData,
    issueTotalHours,
    categoryTotalHours,
    detailedData,
    viewMode,
  } = analyzerState;

  // Get resizable columns for detailed data table
  const detailedDataColumns = getDetailedDataColumns(viewMode);
  const { getResizableColumns: getDetailedDataResizableColumns } =
    useResizableColumns(detailedDataColumns);
  const resizableDetailedDataColumns =
    getDetailedDataResizableColumns(detailedDataColumns);

  // Define columns for issue user data table
  const issueUserColumns = [
    {
      title: "Full Name",
      dataIndex: "name",
      key: "name",
      render: (text: any) => <Text strong>{text}</Text>,
    },
    {
      title: "Logged Hours",
      dataIndex: "hours",
      key: "hours",
      render: (text: any) => <Text>{text.toFixed(2)} hrs</Text>,
      sorter: (a: any, b: any) => a.hours - b.hours,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Logged Days",
      dataIndex: "chargeableDays",
      key: "chargeableDays",
      render: (text: any) => <Text>{text.toFixed(2)} days</Text>,
      sorter: (a: any, b: any) => a.chargeableDays - b.chargeableDays,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      render: (text: any) => <Text type="secondary">{text}%</Text>,
    },
  ];

  const { getResizableColumns: getIssueUserResizableColumns } =
    useResizableColumns(issueUserColumns);
  const resizableIssueUserColumns =
    getIssueUserResizableColumns(issueUserColumns);

  if (selectedUser && !selectedUserCategory) {
    // User Category Breakdown View (Name → Category)
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Button
            icon={<UserOutlined />}
            onClick={handleBackToSummary}
            style={{ marginRight: "16px" }}
          >
            Back to Summary
          </Button>
          <Title level={4} style={{ margin: 0, flex: 1 }}>
            <UserOutlined style={{ marginRight: "8px" }} />
            {selectedUser} - Account Category Breakdown
          </Title>
        </div>

        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="User Total Hours"
                value={userTotalHours}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Categories"
                value={Object.keys(userCategoryData).length}
                suffix=""
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Average per Category"
                value={userTotalHours / Object.keys(userCategoryData).length}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={`${selectedUser} - Hours by Account Category (Click a row to see issues)`}
        >
          <Table
            dataSource={Object.entries(userCategoryData).map(
              ([category, hours]: [string, number], index) => ({
                key: index,
                category: category,
                hours: hours,
                chargeableDays: hours / 7.5,
                percentage: ((hours / userTotalHours) * 100).toFixed(1),
              })
            )}
            columns={resizableUserCategoryColumns}
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => handleUserCategoryClick(record.category),
              style: { cursor: "pointer" },
            })}
            components={{
              header: {
                cell: (props: any) => {
                  const { onResize, width, ...restProps } = props;
                  return (
                    <th
                      {...restProps}
                      style={{
                        position: "relative",
                        cursor: "col-resize",
                        userSelect: "none",
                        width: width,
                      }}
                    >
                      {restProps.children}
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "4px",
                          cursor: "col-resize",
                          backgroundColor: "transparent",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = width;

                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = e.clientX - startX;
                            const newWidth = Math.max(50, startWidth + deltaX);
                            onResize({ width: newWidth });
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </th>
                  );
                },
              },
            }}
          />
        </Card>
      </>
    );
  } else if (selectedUserCategory) {
    // User Category Issue Breakdown View (Name → Category → Issue)
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Button
            icon={<UserOutlined />}
            onClick={handleBackToSummary}
            style={{ marginRight: "8px" }}
          >
            Summary
          </Button>
          <Text style={{ marginRight: "8px" }}>/</Text>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => handleUserCategoryClick("")}
            style={{ marginRight: "16px" }}
          >
            {selectedUser}
          </Button>
          <Title level={4} style={{ margin: 0, flex: 1 }}>
            <BugOutlined style={{ marginRight: "8px" }} />
            {selectedUser} - {selectedUserCategory} - Issues
          </Title>
        </div>

        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Category Total Hours"
                value={userCategoryIssueTotal}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Issues"
                value={Object.keys(userCategoryIssueData).length}
                suffix=""
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Average per Issue"
                value={
                  userCategoryIssueTotal /
                  Object.keys(userCategoryIssueData).length
                }
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={`${selectedUser} - ${selectedUserCategory} - Hours by Issue Key`}
        >
          <Table
            dataSource={Object.entries(userCategoryIssueDataWithType).map(
              ([issueKey, data]: [string, IssueDetail], index) => ({
                key: index,
                issueKey: issueKey,
                type: data.type,
                summary: data.summary,
                hours: data.hours,
                chargeableDays: data.hours / 7.5,
                percentage: (
                  (data.hours / userCategoryIssueTotal) *
                  100
                ).toFixed(1),
              })
            )}
            columns={resizableUserCategoryIssueColumns}
            pagination={false}
            size="small"
            components={{
              header: {
                cell: (props: any) => {
                  const { onResize, width, ...restProps } = props;
                  return (
                    <th
                      {...restProps}
                      style={{
                        position: "relative",
                        cursor: "col-resize",
                        userSelect: "none",
                        width: width,
                      }}
                    >
                      {restProps.children}
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "4px",
                          cursor: "col-resize",
                          backgroundColor: "transparent",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = width;

                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = e.clientX - startX;
                            const newWidth = Math.max(50, startWidth + deltaX);
                            onResize({ width: newWidth });
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </th>
                  );
                },
              },
            }}
          />
        </Card>
      </>
    );
  } else if (!selectedIssueKey) {
    // Detailed View (Category → Issue/Name)
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Button
            icon={<BarChartOutlined />}
            onClick={handleBackToSummary}
            style={{ marginRight: "16px" }}
          >
            Back to Summary
          </Button>
          <Title level={4} style={{ margin: 0, flex: 1 }}>
            <BarChartOutlined style={{ marginRight: "8px" }} />
            {selectedCategory} - Breakdown
          </Title>
          <Radio.Group
            value={viewMode}
            onChange={(e) => handleViewModeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="name">
              <UserOutlined style={{ marginRight: "4px" }} />
              Full Name
            </Radio.Button>
            <Radio.Button value="issue">
              <BugOutlined style={{ marginRight: "4px" }} />
              Issue Key
            </Radio.Button>
            <Radio.Button value="type">
              <BarChartOutlined style={{ marginRight: "4px" }} />
              Issue Type
            </Radio.Button>
            <Radio.Button value="account">
              <UserOutlined style={{ marginRight: "4px" }} />
              Account Name
            </Radio.Button>
          </Radio.Group>
        </div>

        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Category Total Hours"
                value={categoryTotalHours}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={
                  viewMode === "name"
                    ? "People"
                    : viewMode === "type"
                      ? "Types"
                      : viewMode === "account"
                        ? "Accounts"
                        : "Issues"
                }
                value={Object.keys(detailedData).length}
                suffix=""
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={`Average per ${
                  viewMode === "name"
                    ? "Person"
                    : viewMode === "type"
                      ? "Type"
                      : viewMode === "account"
                        ? "Account"
                        : "Issue"
                }`}
                value={categoryTotalHours / Object.keys(detailedData).length}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={`${selectedCategory} - Hours by ${
            viewMode === "name"
              ? "Full Name"
              : viewMode === "issue"
                ? "Issue Key"
                : viewMode === "account"
                  ? "Account Name"
                  : "Issue Type"
          }${
            viewMode === "issue"
              ? " (Click an issue to see user breakdown)"
              : ""
          }`}
        >
          <Table
            dataSource={
              viewMode === "issue"
                ? Object.entries(detailedByIssueWithType).map(
                    ([issueKey, data]: [string, IssueDetail], index) => ({
                      key: index,
                      item: issueKey,
                      hours: data.hours,
                      type: data.type,
                      summary: data.summary,
                      chargeableDays: data.hours / 7.5,
                      percentage: (
                        (data.hours / categoryTotalHours) *
                        100
                      ).toFixed(1),
                    })
                  )
                : viewMode === "type"
                  ? Object.entries(detailedByType).map(
                      ([type, hours]: [string, number], index) => ({
                        key: index,
                        item: type,
                        hours: hours,
                        chargeableDays: hours / 7.5,
                        percentage: (
                          (hours / categoryTotalHours) *
                          100
                        ).toFixed(1),
                      })
                    )
                  : viewMode === "account"
                    ? Object.entries(analyzerState.detailedByAccount).map(
                        ([account, hours]: [string, number], index) => ({
                          key: index,
                          item: account,
                          hours: hours,
                          chargeableDays: hours / 7.5,
                          percentage: (
                            (hours / categoryTotalHours) *
                            100
                          ).toFixed(1),
                        })
                      )
                    : Object.entries(detailedData).map(
                        ([item, hours]: [string, number], index) => ({
                          key: index,
                          item: item,
                          hours: hours,
                          chargeableDays: hours / 7.5,
                          percentage: (
                            (hours / categoryTotalHours) *
                            100
                          ).toFixed(1),
                        })
                      )
            }
            columns={resizableDetailedDataColumns}
            pagination={false}
            size="small"
            onRow={
              viewMode === "issue"
                ? (record) => ({
                    onClick: () => handleIssueKeyClick(record.item),
                    style: { cursor: "pointer" },
                  })
                : undefined
            }
            components={{
              header: {
                cell: (props: any) => {
                  const { onResize, width, ...restProps } = props;
                  return (
                    <th
                      {...restProps}
                      style={{
                        position: "relative",
                        cursor: "col-resize",
                        userSelect: "none",
                        width: width,
                      }}
                    >
                      {restProps.children}
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "4px",
                          cursor: "col-resize",
                          backgroundColor: "transparent",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = width;

                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = e.clientX - startX;
                            const newWidth = Math.max(50, startWidth + deltaX);
                            onResize({ width: newWidth });
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </th>
                  );
                },
              },
            }}
          />
        </Card>
      </>
    );
  } else {
    // Issue Key User Breakdown View (Category → Issue → User)
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Button
            icon={<BarChartOutlined />}
            onClick={handleBackToSummary}
            style={{ marginRight: "8px" }}
          >
            Summary
          </Button>
          <Text style={{ marginRight: "8px" }}>/</Text>
          <Button
            icon={<BugOutlined />}
            onClick={handleBackToIssueView}
            style={{ marginRight: "16px" }}
          >
            {selectedCategory}
          </Button>
          <Title level={4} style={{ margin: 0, flex: 1 }}>
            <UserOutlined style={{ marginRight: "8px" }} />
            {selectedIssueKey} - User Breakdown
          </Title>
        </div>

        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Issue Total Hours"
                value={issueTotalHours}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="People"
                value={Object.keys(issueUserData).length}
                suffix=""
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Average per Person"
                value={issueTotalHours / Object.keys(issueUserData).length}
                precision={2}
                suffix="hrs"
              />
            </Card>
          </Col>
        </Row>

        <Card title={`${selectedIssueKey} - Hours by Full Name`}>
          <Table
            dataSource={Object.entries(issueUserData).map(
              ([name, hours]: [string, number], index) => ({
                key: index,
                name: name,
                hours: hours,
                chargeableDays: hours / 7.5,
                percentage: ((hours / issueTotalHours) * 100).toFixed(1),
              })
            )}
            columns={resizableIssueUserColumns}
            pagination={false}
            size="small"
            components={{
              header: {
                cell: (props: any) => {
                  const { onResize, width, ...restProps } = props;
                  return (
                    <th
                      {...restProps}
                      style={{
                        position: "relative",
                        cursor: "col-resize",
                        userSelect: "none",
                        width: width,
                      }}
                    >
                      {restProps.children}
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "4px",
                          cursor: "col-resize",
                          backgroundColor: "transparent",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = width;

                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = e.clientX - startX;
                            const newWidth = Math.max(50, startWidth + deltaX);
                            onResize({ width: newWidth });
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </th>
                  );
                },
              },
            }}
          />
        </Card>
      </>
    );
  }
};
