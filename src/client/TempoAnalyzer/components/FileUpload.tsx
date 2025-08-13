import React from "react";
import { Upload, Button, Typography, Space, Alert, message } from "antd";
import { UploadOutlined, FileExcelOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface FileUploadProps {
  isLoading: boolean;
  handleFileUpload: (file: File) => void;
  handleMultipleFileUpload: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  isLoading,
  handleFileUpload,
  handleMultipleFileUpload,
}) => {
  const beforeUpload = (file: File, fileList: File[]) => {
    if (fileList.length > 1) {
      if (fileList[0] !== file) {
        return false;
      }

      for (const f of fileList) {
        const isExcel =
          f.type ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          f.type === "application/vnd.ms-excel" ||
          f.name.endsWith(".xlsx") ||
          f.name.endsWith(".xls");

        if (!isExcel) {
          message.error("You can only upload Excel files!");
          return false;
        }

        const isLt10M = f.size / 1024 / 1024 < 10;
        if (!isLt10M) {
          message.error("File must be smaller than 10MB!");
          return false;
        }
      }

      handleMultipleFileUpload(fileList);
      return false;
    } else {
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

      handleFileUpload(file);
      return false;
    }
  };

  return (
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
        description="Upload Excel files (.xlsx or .xls) to begin analysis. Only sheets named 'Worklogs' will be processed. You can upload multiple files at once and select which Worklogs sheets to include in your analysis."
        type="info"
        showIcon
      />

      <Upload
        beforeUpload={beforeUpload}
        showUploadList={false}
        accept=".xlsx,.xls"
        multiple={true}
      >
        <Button
          icon={<UploadOutlined />}
          size="large"
          loading={isLoading}
          type="primary"
        >
          {isLoading ? "Processing..." : "Upload Excel Files"}
        </Button>
      </Upload>
    </Space>
  );
};
