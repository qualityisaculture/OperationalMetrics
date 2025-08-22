import React from "react";
import { Card, Table, Typography, Collapse } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { UserGroup, UserGroupAssignment } from "../types";

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface GroupTimeBreakdownProps {
  userGroups: {
    groups: UserGroup[];
    assignments: UserGroupAssignment[];
  };
  // Data from the main analyzer
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
  // Raw filtered data to process per group
  filteredData: any[];
  // Column indices
  accountCategoryIndex: number;
  loggedHoursIndex: number;
  fullNameIndex: number;
}

export const GroupTimeBreakdown: React.FC<GroupTimeBreakdownProps> = ({
  userGroups,
  groupedDataByCategory,
  filteredData,
  accountCategoryIndex,
  loggedHoursIndex,
  fullNameIndex,
}) => {
  // Calculate breakdown for each group
  const getGroupBreakdown = (groupId: string | null) => {
    // Get users in this group
    const usersInGroup = userGroups.assignments
      .filter((assignment) => assignment.groupId === groupId)
      .map((assignment) => assignment.fullName);

    if (usersInGroup.length === 0) {
      return [];
    }

    // Filter data for users in this group
    const groupData = filteredData.filter((row) => {
      const fullName = row[fullNameIndex.toString()];
      return fullName && usersInGroup.includes(fullName);
    });

    // Calculate breakdown by Account Category
    const breakdown: { [category: string]: number } = {};
    let totalHours = 0;

    groupData.forEach((row) => {
      const accountCategory = row[accountCategoryIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

      if (accountCategory) {
        const category = String(accountCategory).trim();
        if (category) {
          breakdown[category] = (breakdown[category] || 0) + loggedHours;
          totalHours += loggedHours;
        }
      }
    });

    // Convert to array format for table
    return Object.entries(breakdown).map(([category, hours]) => ({
      key: category,
      category,
      days: (hours / 8).toFixed(1), // Convert hours to days (assuming 8-hour workday)
      percentage:
        totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : "0.0",
      hours: hours.toFixed(1),
    }));
  };

  const columns = [
    {
      title: "Account Category",
      dataIndex: "category",
      key: "category",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Days",
      dataIndex: "days",
      key: "days",
      align: "right" as const,
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: "Hours",
      dataIndex: "hours",
      key: "hours",
      align: "right" as const,
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      align: "right" as const,
      render: (text: string) => <Text>{text}%</Text>,
    },
  ];

  return (
    <Card style={{ marginTop: "20px" }}>
      <Collapse defaultActiveKey={["group-breakdown"]} ghost>
        <Panel
          header={
            <span>
              <TeamOutlined style={{ marginRight: "8px" }} />
              Group Time Breakdown
            </span>
          }
          key="group-breakdown"
        >
          <div style={{ marginBottom: "16px" }}>
            <Text type="secondary">
              Shows time breakdown by Account Category for each user group
            </Text>
          </div>

          {userGroups.groups.map((group) => {
            const breakdown = getGroupBreakdown(group.id);
            const totalGroupHours = breakdown.reduce(
              (sum, item) => sum + parseFloat(item.hours),
              0
            );

            return (
              <div
                key={group.id}
                style={{
                  marginBottom: "24px",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  padding: "16px",
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
                    {group.name}
                  </Title>
                  <Text type="secondary">
                    Total: {totalGroupHours.toFixed(1)} hours
                  </Text>
                </div>

                {breakdown.length > 0 ? (
                  <Table
                    dataSource={breakdown}
                    columns={columns}
                    pagination={false}
                    size="small"
                    style={{ backgroundColor: "white" }}
                  />
                ) : (
                  <Text type="secondary">
                    No time data available for this group
                  </Text>
                )}
              </div>
            );
          })}
        </Panel>
      </Collapse>
    </Card>
  );
};
