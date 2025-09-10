import React from "react";
import { Radio, Checkbox, DatePicker, Space, Typography, Select } from "antd";
import {
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { UserGroup } from "../types";

const { Text } = Typography;
const { Option } = Select;

interface FilterControlsProps {
  summaryViewMode: "category" | "name";
  handleSummaryViewModeChange: (mode: "category" | "name") => void;
  secondarySplitMode: "account" | "issueType";
  handleSecondarySplitModeChange: (mode: "account" | "issueType") => void;
  excludeHolidayAbsence: boolean;
  handleExcludeHolidayAbsenceChange: (checked: boolean) => void;
  excludeStartDate: Date | null;
  handleExcludeStartDateChange: (date: any) => void;
  excludeEndDate: Date | null;
  handleExcludeEndDateChange: (date: any) => void;
  showOtherTeams: boolean;
  handleShowOtherTeamsChange: (checked: boolean) => void;
  hasGroupedData: boolean;
  hasGroupedByName: boolean;
  userGroups: UserGroup[];
  selectedUserGroups: string[];
  onUserGroupsChange: (groupIds: string[]) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  summaryViewMode,
  handleSummaryViewModeChange,
  secondarySplitMode,
  handleSecondarySplitModeChange,
  excludeHolidayAbsence,
  handleExcludeHolidayAbsenceChange,
  excludeStartDate,
  handleExcludeStartDateChange,
  excludeEndDate,
  handleExcludeEndDateChange,
  showOtherTeams,
  handleShowOtherTeamsChange,
  hasGroupedData,
  hasGroupedByName,
  userGroups,
  selectedUserGroups,
  onUserGroupsChange,
}) => {
  if (!hasGroupedData) {
    return null;
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Radio.Group
          value={summaryViewMode}
          onChange={(e) => handleSummaryViewModeChange(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="category">
            <BarChartOutlined style={{ marginRight: "4px" }} />
            Account Category
          </Radio.Button>
          {hasGroupedByName && (
            <Radio.Button value="name">
              <UserOutlined style={{ marginRight: "4px" }} />
              Full Name
            </Radio.Button>
          )}
        </Radio.Group>

        {summaryViewMode === "category" && (
          <div style={{ marginTop: "8px" }}>
            <Text strong>Secondary Split:</Text>
            <br />
            <Radio.Group
              value={secondarySplitMode}
              onChange={(e) => handleSecondarySplitModeChange(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="account">Account Name</Radio.Button>
              <Radio.Button value="issueType">Issue Type</Radio.Button>
            </Radio.Group>
          </div>
        )}

        <div style={{ marginTop: "8px" }}>
          {/* User Group Filter */}
          <div style={{ marginBottom: "12px" }}>
            <Text strong>
              <TeamOutlined style={{ marginRight: "4px" }} />
              Filter by User Groups:
            </Text>
            <br />
            <Select
              mode="multiple"
              placeholder="Select user groups to include"
              value={selectedUserGroups}
              onChange={onUserGroupsChange}
              style={{ width: "100%", marginTop: "4px" }}
              allowClear
              maxTagCount="responsive"
            >
              {userGroups.map((group) => (
                <Option key={group.id} value={group.id}>
                  {group.name}
                </Option>
              ))}
            </Select>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              Only data from users in the selected groups will be included.
              Select no groups to show all data.
            </Text>
          </div>

          <Checkbox
            checked={excludeHolidayAbsence}
            onChange={(e) =>
              handleExcludeHolidayAbsenceChange(e.target.checked)
            }
          >
            Exclude Holiday & Absence data (ABS-56, ABS-58, ABS-57)
          </Checkbox>
          <br />
          <Checkbox
            checked={showOtherTeams}
            onChange={(e) => handleShowOtherTeamsChange(e.target.checked)}
          >
            Show percentage done by other teams
          </Checkbox>
          <br />
          <div>
            <Text strong>Date Range Filter:</Text>
            <br />
            <Space style={{ marginTop: "4px" }}>
              <DatePicker
                value={excludeStartDate}
                onChange={handleExcludeStartDateChange}
                placeholder="Start date (optional)"
                allowClear
              />
              <Text type="secondary">to</Text>
              <DatePicker
                value={excludeEndDate}
                onChange={handleExcludeEndDateChange}
                placeholder="End date (optional)"
                allowClear
              />
            </Space>
            <br />
            <Text type="secondary" style={{ marginTop: "4px" }}>
              Only data within the selected date range will be included. Leave
              both blank to include all data.
            </Text>
          </div>
        </div>
      </Space>
    </div>
  );
};
