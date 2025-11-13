import React, { useState, useMemo } from "react";
import { Card, Table, Typography, Switch, Space } from "antd";
import { SheetData } from "../types";
import { useResizableColumns } from "../../components/tables/useResizableColumns";

const { Text } = Typography;

interface TeamSummaryProps {
  sheets: SheetData[];
  selectedSheets: string[];
  filteredData: any[];
  accountCategoryIndex: number;
  loggedHoursIndex: number;
  issueTypeIndex: number;
  excludeHolidayAbsence: boolean;
}

interface TeamSummaryRow {
  key: string;
  fileName: string;
  chargeableDays: number;
  chargeablePercentage: number;
  nonChargeableDays: number;
  nonChargeablePercentage: number;
  otherDays: number;
  otherPercentage: number;
  totalDays: number;
  // Dynamic type columns
  [key: string]: any;
}

export const TeamSummary: React.FC<TeamSummaryProps> = ({
  sheets,
  selectedSheets,
  filteredData,
  accountCategoryIndex,
  loggedHoursIndex,
  issueTypeIndex,
  excludeHolidayAbsence,
}) => {
  const [splitByType, setSplitByType] = useState(false);

  // Calculate summary data for each file
  const { summaryData, allTypes } = useMemo(() => {
    if (loggedHoursIndex === -1) {
      return { summaryData: [], allTypes: [] };
    }

    // If splitting by type, we need issueTypeIndex
    if (splitByType && issueTypeIndex === -1) {
      return { summaryData: [], allTypes: [] };
    }

    // If splitting by category, we need accountCategoryIndex
    if (!splitByType && accountCategoryIndex === -1) {
      return { summaryData: [], allTypes: [] };
    }

    // Group data by file name
    const fileData: { [fileName: string]: any[] } = {};

    filteredData.forEach((row) => {
      const fileName = (row as any)._fileName;
      if (fileName) {
        if (!fileData[fileName]) {
          fileData[fileName] = [];
        }
        fileData[fileName].push(row);
      }
    });

    // Collect all unique types if splitting by type
    const typeSet = new Set<string>();
    if (splitByType) {
      filteredData.forEach((row) => {
        const issueType = row[issueTypeIndex.toString()];
        const type = issueType ? String(issueType).trim() : "Unknown";
        typeSet.add(type);
      });
    }

    const allTypesArray = Array.from(typeSet).sort();

    // Calculate summary for each file
    const summaryRows: TeamSummaryRow[] = [];

    Object.entries(fileData).forEach(([fileName, rows]) => {
      let totalHours = 0;
      const rowData: any = {
        key: fileName,
        fileName,
        totalDays: 0,
      };

      if (splitByType) {
        // Group by issue types
        const typeHours: { [type: string]: number } = {};

        rows.forEach((row) => {
          const issueType = row[issueTypeIndex.toString()];
          const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;
          totalHours += loggedHours;

          const type = issueType ? String(issueType).trim() : "Unknown";
          if (!typeHours[type]) {
            typeHours[type] = 0;
          }
          typeHours[type] += loggedHours;
        });

        // Add type columns to row data
        allTypesArray.forEach((type) => {
          const hours = typeHours[type] || 0;
          const days = hours / 7.5;
          const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
          rowData[`${type}_days`] = days;
          rowData[`${type}_percentage`] = percentage;
        });
      } else {
        // Group by category (original logic)
        let chargeableHours = 0;
        let nonChargeableHours = 0;
        let otherHours = 0;

        rows.forEach((row) => {
          const accountCategory = row[accountCategoryIndex.toString()];
          const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

          totalHours += loggedHours;

          if (accountCategory) {
            const category = String(accountCategory).trim();

            if (category === "Chargeable") {
              chargeableHours += loggedHours;
            } else if (
              category === "Non-Chargeable" ||
              category === "Non Chargeable"
            ) {
              nonChargeableHours += loggedHours;
            } else {
              otherHours += loggedHours;
            }
          } else {
            otherHours += loggedHours;
          }
        });

        const chargeablePercentage =
          totalHours > 0 ? (chargeableHours / totalHours) * 100 : 0;
        const nonChargeablePercentage =
          totalHours > 0 ? (nonChargeableHours / totalHours) * 100 : 0;
        const otherPercentage =
          totalHours > 0 ? (otherHours / totalHours) * 100 : 0;

        // Convert hours to days (7.5 hours per day)
        const chargeableDays = chargeableHours / 7.5;
        const nonChargeableDays = nonChargeableHours / 7.5;
        const otherDays = otherHours / 7.5;

        rowData.chargeableDays = chargeableDays;
        rowData.chargeablePercentage = chargeablePercentage;
        rowData.nonChargeableDays = nonChargeableDays;
        rowData.nonChargeablePercentage = nonChargeablePercentage;
        rowData.otherDays = otherDays;
        rowData.otherPercentage = otherPercentage;
      }

      // Convert hours to days (7.5 hours per day)
      rowData.totalDays = totalHours / 7.5;

      summaryRows.push(rowData as TeamSummaryRow);
    });

    // Sort by total days (descending)
    return {
      summaryData: summaryRows.sort((a, b) => b.totalDays - a.totalDays),
      allTypes: allTypesArray,
    };
  }, [
    filteredData,
    accountCategoryIndex,
    loggedHoursIndex,
    issueTypeIndex,
    splitByType,
  ]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "File Name",
        dataIndex: "fileName",
        key: "fileName",
        render: (text: string) => <Text strong>{text}</Text>,
      },
    ];

    if (splitByType) {
      // Dynamic columns for each issue type
      const typeColumns = allTypes.map((type) => ({
        title: type,
        key: `${type}_column`,
        render: (_: any, record: TeamSummaryRow) => {
          const percentage = record[`${type}_percentage`] || 0;
          const days = record[`${type}_days`] || 0;
          return (
            <div>
              <Text>{percentage.toFixed(1)}%</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {days.toFixed(1)}d
              </Text>
            </div>
          );
        },
        sorter: (a: TeamSummaryRow, b: TeamSummaryRow) => {
          const aDays = a[`${type}_days`] || 0;
          const bDays = b[`${type}_days`] || 0;
          return aDays - bDays;
        },
      }));

      return [
        ...baseColumns,
        ...typeColumns,
        {
          title: "Total Days",
          dataIndex: "totalDays",
          key: "totalDays",
          render: (days: number) => <Text strong>{days.toFixed(1)}d</Text>,
          sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
            a.totalDays - b.totalDays,
        },
      ];
    } else {
      // Original category columns
      return [
        ...baseColumns,
        {
          title: "Chargeable",
          dataIndex: "chargeablePercentage",
          key: "chargeablePercentage",
          render: (percentage: number, record: TeamSummaryRow) => (
            <div>
              <Text>{percentage.toFixed(1)}%</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.chargeableDays.toFixed(1)}d
              </Text>
            </div>
          ),
          sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
            a.chargeablePercentage - b.chargeablePercentage,
        },
        {
          title: "Non-Chargeable",
          dataIndex: "nonChargeablePercentage",
          key: "nonChargeablePercentage",
          render: (percentage: number, record: TeamSummaryRow) => (
            <div>
              <Text>{percentage.toFixed(1)}%</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.nonChargeableDays.toFixed(1)}d
              </Text>
            </div>
          ),
          sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
            a.nonChargeablePercentage - b.nonChargeablePercentage,
        },
        {
          title: "Other",
          dataIndex: "otherPercentage",
          key: "otherPercentage",
          render: (percentage: number, record: TeamSummaryRow) => (
            <div>
              <Text>{percentage.toFixed(1)}%</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.otherDays.toFixed(1)}d
              </Text>
            </div>
          ),
          sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
            a.otherPercentage - b.otherPercentage,
        },
        {
          title: "Total Days",
          dataIndex: "totalDays",
          key: "totalDays",
          render: (days: number) => <Text strong>{days.toFixed(1)}d</Text>,
          sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
            a.totalDays - b.totalDays,
        },
      ];
    }
  }, [splitByType, allTypes]);

  const { getResizableColumns } = useResizableColumns(columns);
  const resizableColumns = getResizableColumns(columns);

  if (summaryData.length === 0) {
    return null;
  }

  const title = `Team Summary ${excludeHolidayAbsence ? "(EXCLUDING HOLIDAY)" : "(INCLUDING HOLIDAY)"}`;

  return (
    <Card
      title={
        <Space>
          <span>{title}</span>
          <Switch
            checked={splitByType}
            onChange={setSplitByType}
            checkedChildren="Type"
            unCheckedChildren="Category"
            style={{ marginLeft: "16px" }}
          />
        </Space>
      }
      style={{ marginBottom: "20px" }}
    >
      <Table
        dataSource={summaryData}
        columns={resizableColumns}
        pagination={false}
        size="small"
        scroll={{ x: 600 }}
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
                        document.removeEventListener("mouseup", handleMouseUp);
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
        summary={(pageData) => {
          const grandTotal = pageData.reduce(
            (sum, row) => sum + row.totalDays,
            0
          );

          if (splitByType) {
            // Calculate totals for each type
            const typeTotals: { [type: string]: number } = {};
            allTypes.forEach((type) => {
              typeTotals[type] = pageData.reduce(
                (sum, row) => sum + (row[`${type}_days`] || 0),
                0
              );
            });

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                {allTypes.map((type, index) => {
                  const totalDays = typeTotals[type] || 0;
                  const percentage =
                    grandTotal > 0 ? (totalDays / grandTotal) * 100 : 0;
                  return (
                    <Table.Summary.Cell key={type} index={index + 1}>
                      <div>
                        <Text strong>{percentage.toFixed(1)}%</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {totalDays.toFixed(1)}d
                        </Text>
                      </div>
                    </Table.Summary.Cell>
                  );
                })}
                <Table.Summary.Cell index={allTypes.length + 1}>
                  <Text strong>{grandTotal.toFixed(1)}d</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          } else {
            // Original category totals
            const totalChargeable = pageData.reduce(
              (sum, row) => sum + row.chargeableDays,
              0
            );
            const totalNonChargeable = pageData.reduce(
              (sum, row) => sum + row.nonChargeableDays,
              0
            );
            const totalOther = pageData.reduce(
              (sum, row) => sum + row.otherDays,
              0
            );

            const chargeablePercentage =
              grandTotal > 0 ? (totalChargeable / grandTotal) * 100 : 0;
            const nonChargeablePercentage =
              grandTotal > 0 ? (totalNonChargeable / grandTotal) * 100 : 0;
            const otherPercentage =
              grandTotal > 0 ? (totalOther / grandTotal) * 100 : 0;

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <div>
                    <Text strong>{chargeablePercentage.toFixed(1)}%</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {totalChargeable.toFixed(1)}d
                    </Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <div>
                    <Text strong>{nonChargeablePercentage.toFixed(1)}%</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {totalNonChargeable.toFixed(1)}d
                    </Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <div>
                    <Text strong>{otherPercentage.toFixed(1)}%</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {totalOther.toFixed(1)}d
                    </Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <Text strong>{grandTotal.toFixed(1)}d</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }
        }}
      />
    </Card>
  );
};
