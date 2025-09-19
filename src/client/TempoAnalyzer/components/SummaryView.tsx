import React from "react";
import { Row, Col, Card, Statistic, Table, Typography } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import { useResizableColumns } from "../../components/tables/useResizableColumns";

const { Title, Text } = Typography;

interface SummaryViewProps {
  summaryViewMode: "category" | "name";
  totalHours: number;
  groupedData: { [key: string]: number };
  groupedByName: { [key: string]: number };
  groupedDataByCategory: {
    [category: string]: {
      totalHours: number;
      accounts: {
        [accountName: string]: {
          totalHours: number;
          files: { [fileName: string]: number };
        };
      };
      issueTypes: {
        [issueType: string]: {
          totalHours: number;
          files: { [fileName: string]: number };
        };
      };
    };
  };
  secondarySplitMode: "account" | "issueType";
  showOtherTeams: boolean;
  handleRowClick: (category: string) => void;
  handleUserClick: (userName: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  summaryViewMode,
  totalHours,
  groupedData,
  groupedByName,
  groupedDataByCategory,
  secondarySplitMode,
  showOtherTeams,
  handleRowClick,
  handleUserClick,
}) => {
  // Define columns for resizable functionality
  const columns = [
    {
      title: summaryViewMode === "category" ? "Account Category" : "Full Name",
      dataIndex: "item",
      key: "item",
      render: (text: any, record: any) => (
        <Text strong={!record.isAccount && !record.isFile}>
          {record.isAccount && "  "}
          {record.isFile && "    "}
          {text}
        </Text>
      ),
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
      render: (text: any, record: any) => (
        <Text type="secondary">
          {text}%
          {record.isAccount &&
            record.subPercentage &&
            ` (${record.subPercentage}%)`}
          {record.isFile &&
            record.subPercentage &&
            ` (${record.subPercentage}%)`}
        </Text>
      ),
    },
    // Conditional columns for other teams
    ...(showOtherTeams
      ? [
          {
            title: "Other Team Days",
            dataIndex: "otherTeamDays",
            key: "otherTeamDays",
            render: (text: any, record: any) => (
              <Text type="secondary">
                {record.isAccount || (!record.isAccount && !record.isFile)
                  ? text.toFixed(2)
                  : "-"}
              </Text>
            ),
            sorter: (a: any, b: any) =>
              (a.otherTeamDays || 0) - (b.otherTeamDays || 0),
          },
          {
            title: "Other Team %",
            dataIndex: "otherTeamPercent",
            key: "otherTeamPercent",
            render: (text: any, record: any) => (
              <Text type="secondary">
                {record.isAccount || (!record.isAccount && !record.isFile)
                  ? `${text}%`
                  : "-"}
              </Text>
            ),
            sorter: (a: any, b: any) =>
              parseFloat(a.otherTeamPercent || "0") -
              parseFloat(b.otherTeamPercent || "0"),
          },
        ]
      : []),
  ];

  const { getResizableColumns } = useResizableColumns(columns);
  const resizableColumns = getResizableColumns(columns);
  return (
    <>
      <Title level={4}>
        <BarChartOutlined style={{ marginRight: "8px" }} />
        {summaryViewMode === "category" ? "Account Category" : "Full Name"}{" "}
        Summary
      </Title>

      <Row gutter={16} style={{ marginBottom: "24px" }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Hours"
              value={totalHours}
              precision={2}
              suffix="hrs"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Days"
              value={totalHours / 7.5}
              precision={2}
              suffix="days"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={`Average per ${
                summaryViewMode === "category" ? "Category" : "Person"
              }`}
              value={
                totalHours /
                (summaryViewMode === "category"
                  ? Object.keys(groupedData).length
                  : Object.keys(groupedByName).length)
              }
              precision={2}
              suffix="hrs"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={`Hours by ${
          summaryViewMode === "category"
            ? `Account Category (split by ${secondarySplitMode === "account" ? "Account Name" : "Issue Type"})`
            : "Full Name"
        } (Click a row to drill down)`}
      >
        <Table
          dataSource={
            summaryViewMode === "category"
              ? Object.entries(groupedDataByCategory).map(
                  ([category, data], index) => ({
                    key: `category-${index}`,
                    item: category,
                    hours: data.totalHours,
                    chargeableDays: data.totalHours / 7.5,
                    percentage: ((data.totalHours / totalHours) * 100).toFixed(
                      1
                    ),
                    // Calculate other team metrics at category level
                    otherTeamDays: showOtherTeams
                      ? (() => {
                          let totalOtherTeamHours = 0;
                          Object.values(data.accounts).forEach(
                            (accountData) => {
                              if (Object.keys(accountData.files).length > 1) {
                                const fileEntries = Object.entries(
                                  accountData.files
                                );
                                const sortedFiles = fileEntries.sort(
                                  ([, a], [, b]) => b - a
                                );
                                // First file is primary team, rest are other teams
                                const otherTeamHours = sortedFiles
                                  .slice(1)
                                  .reduce((sum, [, hours]) => sum + hours, 0);
                                totalOtherTeamHours += otherTeamHours;
                              }
                            }
                          );
                          return totalOtherTeamHours / 7.5;
                        })()
                      : 0,
                    otherTeamPercent: showOtherTeams
                      ? (() => {
                          let totalOtherTeamHours = 0;
                          Object.values(data.accounts).forEach(
                            (accountData) => {
                              if (Object.keys(accountData.files).length > 1) {
                                const fileEntries = Object.entries(
                                  accountData.files
                                );
                                const sortedFiles = fileEntries.sort(
                                  ([, a], [, b]) => b - a
                                );
                                // First file is primary team, rest are other teams
                                const otherTeamHours = sortedFiles
                                  .slice(1)
                                  .reduce((sum, [, hours]) => sum + hours, 0);
                                totalOtherTeamHours += otherTeamHours;
                              }
                            }
                          );
                          return (
                            (totalOtherTeamHours / data.totalHours) *
                            100
                          ).toFixed(1);
                        })()
                      : "0.0",
                    children: (secondarySplitMode === "account"
                      ? Object.entries(data.accounts)
                      : Object.entries(data.issueTypes)
                    ).map(([itemName, itemData], itemIndex) => ({
                      key: `${secondarySplitMode}-${index}-${itemIndex}`,
                      item: itemName,
                      hours: itemData.totalHours,
                      chargeableDays: itemData.totalHours / 7.5,
                      percentage: (
                        (itemData.totalHours / totalHours) *
                        100
                      ).toFixed(1),
                      subPercentage: (
                        (itemData.totalHours / data.totalHours) *
                        100
                      ).toFixed(1),
                      isAccount: true,
                      children:
                        Object.keys(itemData.files).length > 1
                          ? Object.entries(itemData.files)
                              .sort(([, a], [, b]) => b - a) // Sort by hours descending
                              .map(([fileName, fileHours], fileIndex) => ({
                                key: `file-${index}-${itemIndex}-${fileIndex}`,
                                item: fileName,
                                hours: fileHours,
                                chargeableDays: fileHours / 7.5,
                                percentage: (
                                  (fileHours / totalHours) *
                                  100
                                ).toFixed(1),
                                subPercentage: (
                                  (fileHours / itemData.totalHours) *
                                  100
                                ).toFixed(1),
                                isFile: true,
                              }))
                          : undefined,
                      // Calculate other team metrics
                      otherTeamDays:
                        showOtherTeams && Object.keys(itemData.files).length > 1
                          ? (() => {
                              const fileEntries = Object.entries(
                                itemData.files
                              );
                              const sortedFiles = fileEntries.sort(
                                ([, a], [, b]) => b - a
                              );
                              // First file is primary team, rest are other teams
                              const otherTeamHours = sortedFiles
                                .slice(1)
                                .reduce((sum, [, hours]) => sum + hours, 0);
                              return otherTeamHours / 7.5;
                            })()
                          : 0,
                      otherTeamPercent:
                        showOtherTeams && Object.keys(itemData.files).length > 1
                          ? (() => {
                              const fileEntries = Object.entries(
                                itemData.files
                              );
                              const sortedFiles = fileEntries.sort(
                                ([, a], [, b]) => b - a
                              );
                              // First file is primary team, rest are other teams
                              const otherTeamHours = sortedFiles
                                .slice(1)
                                .reduce((sum, [, hours]) => sum + hours, 0);
                              return (
                                (otherTeamHours / itemData.totalHours) *
                                100
                              ).toFixed(1);
                            })()
                          : "0.0",
                    })),
                  })
                )
              : Object.entries(groupedByName).map(([item, hours], index) => ({
                  key: index,
                  item: item,
                  hours: hours,
                  chargeableDays: hours / 7.5,
                  percentage: ((hours / totalHours) * 100).toFixed(1),
                  children: undefined,
                }))
          }
          columns={resizableColumns}
          pagination={false}
          size="small"
          expandable={
            summaryViewMode === "category"
              ? {
                  defaultExpandAllRows: false,
                  expandRowByClick: false,
                }
              : undefined
          }
          onRow={(record: any) => ({
            onClick: () => {
              if (
                summaryViewMode === "category" &&
                !record.isAccount &&
                !record.isFile
              ) {
                handleRowClick(record.item);
              } else if (summaryViewMode === "name") {
                handleUserClick(record.item);
              }
            },
            style: {
              cursor: record.isAccount || record.isFile ? "default" : "pointer",
              fontWeight: record.isAccount || record.isFile ? "normal" : "bold",
            },
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

                        document.addEventListener("mousemove", handleMouseMove);
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
};
