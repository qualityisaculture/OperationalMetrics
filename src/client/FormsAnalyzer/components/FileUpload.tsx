import React from "react";
import { Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";

interface FileUploadProps {
  isLoading: boolean;
  handleFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  isLoading,
  handleFileUpload,
}) => {
  const customRequest = ({ file, onSuccess, onError }: any) => {
    console.log("FileUpload customRequest called with file:", file);

    const isExcel =
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    if (!isExcel) {
      message.error("You can only upload Excel files!");
      onError(new Error("Invalid file type"));
      return;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error("File must be smaller than 10MB!");
      onError(new Error("File too large"));
      return;
    }

    // Process the file
    try {
      handleFileUpload(file);
      onSuccess("ok");
    } catch (error) {
      console.error("Error in customRequest:", error);
      onError(error);
    }
  };

  return (
    <Upload
      name="file"
      customRequest={customRequest}
      showUploadList={false}
      accept=".xlsx,.xls"
    >
      <Button
        icon={<UploadOutlined />}
        loading={isLoading}
        size="large"
        type="primary"
      >
        {isLoading ? "Processing..." : "Upload Microsoft Forms Excel File"}
      </Button>
    </Upload>
  );
};
