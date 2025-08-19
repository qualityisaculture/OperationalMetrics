import React from "react";
import { Row, Col, Card, Statistic, Table, Typography } from "antd";
import { BarChartOutlined } from "@ant-design/icons";

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
    };
  };
  handleRowClick: (category: string) => void;
  handleUserClick: (userName: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  summaryViewMode,
  totalHours,
  groupedData,
  groupedByName,
  groupedDataByCategory,
  handleRowClick,
  handleUserClick,
}) => {
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
          summaryViewMode === "category" ? "Account Category" : "Full Name"
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
                    children: Object.entries(data.accounts).map(
                      ([accountName, accountData], accountIndex) => ({
                        key: `account-${index}-${accountIndex}`,
                        item: accountName,
                        hours: accountData.totalHours,
                        chargeableDays: accountData.totalHours / 7.5,
                        percentage: (
                          (accountData.totalHours / totalHours) *
                          100
                        ).toFixed(1),
                        subPercentage: (
                          (accountData.totalHours / data.totalHours) *
                          100
                        ).toFixed(1),
                        isAccount: true,
                        children: Object.entries(accountData.files)
                          .sort(([, a], [, b]) => b - a) // Sort by hours descending
                          .map(([fileName, fileHours], fileIndex) => ({
                            key: `file-${index}-${accountIndex}-${fileIndex}`,
                            item: fileName,
                            hours: fileHours,
                            chargeableDays: fileHours / 7.5,
                            percentage: (
                              (fileHours / totalHours) *
                              100
                            ).toFixed(1),
                            subPercentage: (
                              (fileHours / accountData.totalHours) *
                              100
                            ).toFixed(1),
                            isFile: true,
                          })),
                      })
                    ),
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
          columns={[
            {
              title:
                summaryViewMode === "category"
                  ? "Account Category"
                  : "Full Name",
              dataIndex: "item",
              key: "item",
              render: (text, record: any) => (
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
              render: (text) => <Text>{text.toFixed(2)} hrs</Text>,
              sorter: (a, b) => a.hours - b.hours,
              defaultSortOrder: "descend" as const,
            },
            {
              title: "Logged Days",
              dataIndex: "chargeableDays",
              key: "chargeableDays",
              render: (text) => <Text>{text.toFixed(2)} days</Text>,
              sorter: (a, b) => a.chargeableDays - b.chargeableDays,
            },
            {
              title: "Percentage",
              dataIndex: "percentage",
              key: "percentage",
              render: (text, record: any) => (
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
          ]}
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
              cursor:
                record.isAccount || record.isFile ? "default" : "pointer",
              fontWeight:
                record.isAccount || record.isFile ? "normal" : "bold",
            },
          })}
        />
      </Card>
    </>
  );
};
