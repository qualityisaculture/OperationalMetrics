import React from "react";
import {
  Upload,
  Button,
  Table,
  message,
  Card,
  Typography,
  Space,
  Alert,
} from "antd";
import { UploadOutlined, FileExcelOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;

interface Props {}

interface State {
  excelData: any[];
  columns: any[];
  isLoading: boolean;
  fileName: string;
}

export default class TempoAnalyzer extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      excelData: [],
      columns: [],
      isLoading: false,
      fileName: "",
    };
  }

  handleFileUpload = (file: File) => {
    this.setState({ isLoading: true, fileName: file.name });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          message.error("The Excel file appears to be empty");
          this.setState({ isLoading: false });
          return;
        }

        // Extract headers from first row
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);

        // Create table columns
        const columns = headers.map((header, index) => ({
          title: header || `Column ${index + 1}`,
          dataIndex: index.toString(),
          key: index.toString(),
          render: (text: any) => {
            if (text === null || text === undefined) return "-";
            if (typeof text === "object") return JSON.stringify(text);
            return String(text);
          },
        }));

        // Create table data
        const tableData = dataRows.map((row, rowIndex) => {
          const rowData: any = { key: rowIndex };
          headers.forEach((_, colIndex) => {
            rowData[colIndex.toString()] = row[colIndex];
          });
          return rowData;
        });

        this.setState({
          excelData: tableData,
          columns: columns,
          isLoading: false,
        });

        message.success(
          `Successfully loaded ${tableData.length} rows from "${firstSheetName}"`
        );
      } catch (error) {
        console.error("Error processing Excel file:", error);
        message.error(
          "Failed to process Excel file. Please check the file format."
        );
        this.setState({ isLoading: false });
      }
    };

    reader.onerror = () => {
      message.error("Failed to read the file");
      this.setState({ isLoading: false });
    };

    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload behavior
  };

  beforeUpload = (file: File) => {
    const isExcel =
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");

    if (!isExcel) {
      message.error("You can only upload Excel files!");
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error("File must be smaller than 10MB!");
      return false;
    }

    this.handleFileUpload(file);
    return false; // Prevent default upload behavior
  };

  render() {
    const { excelData, columns, isLoading, fileName } = this.state;

    return (
      <div style={{ padding: "20px" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Title level={3}>
                <FileExcelOutlined style={{ marginRight: "8px" }} />
                Tempo Analyzer
              </Title>
              <Text type="secondary">
                Upload an Excel file to analyze Tempo data and gain insights
              </Text>
            </div>

            <Alert
              message="Instructions"
              description="Upload an Excel file (.xlsx or .xls) to begin analysis. The first sheet will be automatically processed and displayed below."
              type="info"
              showIcon
            />

            <Upload
              beforeUpload={this.beforeUpload}
              showUploadList={false}
              accept=".xlsx,.xls"
            >
              <Button
                icon={<UploadOutlined />}
                size="large"
                loading={isLoading}
                type="primary"
              >
                {isLoading ? "Processing..." : "Upload Excel File"}
              </Button>
            </Upload>

            {fileName && <Text strong>Current file: {fileName}</Text>}

            {excelData.length > 0 && (
              <div>
                <Title level={4}>Raw Data Preview</Title>
                <Text type="secondary">
                  Showing {excelData.length} rows from the first sheet
                </Text>
                <div style={{ marginTop: "16px" }}>
                  <Table
                    columns={columns}
                    dataSource={excelData}
                    scroll={{ x: true }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} items`,
                    }}
                    size="small"
                  />
                </div>
              </div>
            )}
          </Space>
        </Card>
      </div>
    );
  }
}
