import React from "react";
import { Card, Space, Checkbox, Button, Typography } from "antd";
import { SheetData } from "../types";

const { Text } = Typography;

interface SheetManagerProps {
  sheets: SheetData[];
  selectedSheets: string[];
  handleSheetSelectionChange: (selectedSheets: string[]) => void;
  removeSheet: (sheetName: string, fileName?: string) => void;
}

export const SheetManager: React.FC<SheetManagerProps> = ({
  sheets,
  selectedSheets,
  handleSheetSelectionChange,
  removeSheet,
}) => {
  if (sheets.length === 0) {
    return null;
  }

  return (
    <Card size="small" title="Loaded Worklogs Sheets">
      <Space direction="vertical" style={{ width: "100%" }}>
        {sheets.map((sheet, index) => (
          <div
            key={`${sheet.fileName}-${index}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              backgroundColor: selectedSheets.includes(
                `${sheet.fileName}|${sheet.name}`
              )
                ? "#f0f8ff"
                : "#fafafa",
            }}
          >
            <div>
              <Text strong>{sheet.fileName}</Text>
              <br />
              <Text type="secondary">
                {sheet.data.length} rows from Worklogs sheet
              </Text>
            </div>
            <Space>
              <Checkbox
                checked={selectedSheets.includes(
                  `${sheet.fileName}|${sheet.name}`
                )}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSheetSelectionChange([
                      ...selectedSheets,
                      `${sheet.fileName}|${sheet.name}`,
                    ]);
                  } else {
                    handleSheetSelectionChange(
                      selectedSheets.filter(
                        (name) => name !== `${sheet.fileName}|${sheet.name}`
                      )
                    );
                  }
                }}
              >
                Include
              </Checkbox>
              <Button
                size="small"
                danger
                onClick={() => removeSheet(sheet.name, sheet.fileName)}
              >
                Remove
              </Button>
            </Space>
          </div>
        ))}
      </Space>
    </Card>
  );
};
