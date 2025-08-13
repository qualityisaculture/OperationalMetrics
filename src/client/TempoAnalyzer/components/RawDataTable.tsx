import React from "react";
import { Collapse, Table, Typography } from "antd";

const { Panel } = Collapse;
const { Text } = Typography;

interface RawDataTableProps {
  displayedRows: any[];
  getDisplayedRowsTitle: () => string;
  columns: any[];
}

export const RawDataTable: React.FC<RawDataTableProps> = ({
  displayedRows,
  getDisplayedRowsTitle,
  columns,
}) => {
  if (displayedRows.length === 0) {
    return null;
  }

  return (
    <Collapse>
      <Panel header={`${getDisplayedRowsTitle()} (Click to expand)`} key="1">
        <div>
          <Text type="secondary">
            Showing {displayedRows.length} rows for the current selection
          </Text>
          <div style={{ marginTop: "16px" }}>
            <Table
              columns={columns}
              dataSource={displayedRows}
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
      </Panel>
    </Collapse>
  );
};
