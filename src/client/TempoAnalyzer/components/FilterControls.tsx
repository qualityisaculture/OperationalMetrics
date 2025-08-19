import React from "react";
import { Radio, Checkbox, DatePicker, Space, Typography } from "antd";
import { BarChartOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface FilterControlsProps {
  summaryViewMode: "category" | "name";
  handleSummaryViewModeChange: (mode: "category" | "name") => void;
  excludeHolidayAbsence: boolean;
  handleExcludeHolidayAbsenceChange: (checked: boolean) => void;
  excludeStartDate: Date | null;
  handleExcludeStartDateChange: (date: any) => void;
  excludeEndDate: Date | null;
  handleExcludeEndDateChange: (date: any) => void;
  hasGroupedData: boolean;
  hasGroupedByName: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  summaryViewMode,
  handleSummaryViewModeChange,
  excludeHolidayAbsence,
  handleExcludeHolidayAbsenceChange,
  excludeStartDate,
  handleExcludeStartDateChange,
  excludeEndDate,
  handleExcludeEndDateChange,
  hasGroupedData,
  hasGroupedByName,
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

        <div style={{ marginTop: "8px" }}>
          <Checkbox
            checked={excludeHolidayAbsence}
            onChange={(e) =>
              handleExcludeHolidayAbsenceChange(e.target.checked)
            }
          >
            Exclude Holiday & Absence data (ABS-56, ABS-58, ABS-57)
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
              Only data within the selected date range will be included. Leave both blank to include all data.
            </Text>
          </div>
        </div>
      </Space>
    </div>
  );
};
