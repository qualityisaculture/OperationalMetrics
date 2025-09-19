import React from "react";
import { Collapse, Table, Typography } from "antd";
import { useResizableColumns } from "../../components/tables/useResizableColumns";

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
  const { getResizableColumns } = useResizableColumns(columns);
  const resizableColumns = getResizableColumns(columns);

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
              columns={resizableColumns}
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
                              const newWidth = Math.max(
                                50,
                                startWidth + deltaX
                              );
                              onResize({ width: newWidth });
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener(
                                "mousemove",
                                handleMouseMove
                              );
                              document.removeEventListener(
                                "mouseup",
                                handleMouseUp
                              );
                            };

                            document.addEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.addEventListener("mouseup", handleMouseUp);
                          }}
                        />
                      </th>
                    );
                  },
                },
              }}
            />
          </div>
        </div>
      </Panel>
    </Collapse>
  );
};
