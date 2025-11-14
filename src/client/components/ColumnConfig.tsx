import React, { useState, useEffect, useMemo } from "react";
import { Button, Modal, List, Checkbox, Space, Typography, Divider } from "antd";
import { SettingOutlined, HolderOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

export interface ColumnConfigItem {
  key: string;
  title: string | React.ReactNode;
  visible: boolean;
  order: number;
}

interface ColumnConfigProps<T = any> {
  columns: ColumnsType<T>;
  storageKey: string; // Unique key for localStorage
  onColumnsChange: (columns: ColumnsType<T>) => void;
}

export const ColumnConfig = <T,>({
  columns,
  storageKey,
  onColumnsChange,
}: ColumnConfigProps<T>) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfigItem[]>([]);

  // Helper to check if a column key is a month column
  const isMonthColumn = (key: string): boolean => {
    return key.startsWith("month");
  };

  // Get all month column keys
  const monthColumnKeys = useMemo(() => {
    return columnConfig.filter((item) => isMonthColumn(item.key)).map((item) => item.key);
  }, [columnConfig]);

  // Check if all month columns are visible
  const areMonthColumnsVisible = useMemo(() => {
    if (monthColumnKeys.length === 0) return false;
    return monthColumnKeys.every((key) => {
      const item = columnConfig.find((c) => c.key === key);
      return item?.visible ?? false;
    });
  }, [columnConfig, monthColumnKeys]);

  // Helper to extract title from column
  const getColumnTitle = (col: (typeof columns)[0], index: number): string => {
    if (typeof col.title === "string") return col.title;
    if (React.isValidElement(col.title)) {
      // Try to extract text from React element
      const props = col.title.props;
      if (props?.children) {
        if (typeof props.children === "string") return props.children;
        if (
          React.isValidElement(props.children) &&
          props.children.props?.children
        ) {
          return String(props.children.props.children);
        }
      }
    }
    return `Column ${index + 1}`;
  };

  // Initialize column configuration from localStorage or defaults
  useEffect(() => {
    const initializeDefaultConfig = () => {
      const defaultConfig: ColumnConfigItem[] = columns.map((col, index) => ({
        key: (col.key || col.dataIndex || `col-${index}`) as string,
        title: getColumnTitle(col, index),
        visible: true,
        order: index,
      }));
      setColumnConfig(defaultConfig);
    };

    const savedConfig = localStorage.getItem(storageKey);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as ColumnConfigItem[];
        // Merge with current columns to handle new/removed columns
        const currentKeys = new Set(
          columns.map(
            (col, idx) => (col.key || col.dataIndex || `col-${idx}`) as string
          )
        );
        const savedKeys = new Set(parsed.map((c) => c.key));

        // Add new columns that aren't in saved config
        const mergedConfig: ColumnConfigItem[] = [...parsed];
        let maxOrder = Math.max(...parsed.map((p) => p.order), -1);
        columns.forEach((col, index) => {
          const key = (col.key || col.dataIndex || `col-${index}`) as string;
          if (!savedKeys.has(key)) {
            mergedConfig.push({
              key,
              title: getColumnTitle(col, index),
              visible: true,
              order: ++maxOrder,
            });
          }
        });

        // Remove columns that no longer exist
        const filteredConfig = mergedConfig.filter((c) =>
          currentKeys.has(c.key)
        );

        // Re-sort and renumber
        filteredConfig.sort((a, b) => a.order - b.order);

        setColumnConfig(
          filteredConfig.map((item, idx) => ({ ...item, order: idx }))
        );
      } catch (e) {
        console.warn("Failed to parse saved column config:", e);
        initializeDefaultConfig();
      }
    } else {
      initializeDefaultConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]); // Only depend on storageKey, not columns, to avoid resetting on column changes

  // Merge new columns when columns prop changes
  useEffect(() => {
    if (columnConfig.length === 0) return; // Wait for initial config to load

    const currentKeys = new Set(
      columns.map(
        (col, idx) => (col.key || col.dataIndex || `col-${idx}`) as string
      )
    );
    const configKeys = new Set(columnConfig.map((c) => c.key));

    // Check if there are new columns
    const hasNewColumns = columns.some((col, idx) => {
      const key = (col.key || col.dataIndex || `col-${idx}`) as string;
      return !configKeys.has(key);
    });

    if (hasNewColumns) {
      setColumnConfig((prev) => {
        const updated = [...prev];
        let maxOrder = Math.max(...prev.map((p) => p.order), -1);

        columns.forEach((col, index) => {
          const key = (col.key || col.dataIndex || `col-${index}`) as string;
          if (!configKeys.has(key) && currentKeys.has(key)) {
            updated.push({
              key,
              title: getColumnTitle(col, index),
              visible: true,
              order: ++maxOrder,
            });
          }
        });

        // Remove columns that no longer exist
        const filtered = updated.filter((c) => currentKeys.has(c.key));

        // Re-sort and renumber
        filtered.sort((a, b) => a.order - b.order);
        return filtered.map((item, idx) => ({ ...item, order: idx }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]); // Only trigger when columns change

  // Apply column configuration whenever it or columns change
  useEffect(() => {
    if (columnConfig.length === 0) {
      // If no config yet, use original columns
      onColumnsChange(columns);
      return;
    }

    // Sort by order and filter visible columns
    const sortedConfig = [...columnConfig].sort((a, b) => a.order - b.order);
    const visibleKeys = sortedConfig
      .filter((item) => item.visible)
      .map((item) => item.key);

    // Create a map of columns by key for quick lookup
    const columnMap = new Map<string, (typeof columns)[0]>();
    columns.forEach((col) => {
      const key = (col.key || col.dataIndex || "") as string;
      if (key) {
        columnMap.set(key, col);
      }
    });

    // Reorder and filter columns based on configuration
    const reorderedColumns: ColumnsType<T> = [];
    visibleKeys.forEach((key) => {
      const col = columnMap.get(key);
      if (col) {
        reorderedColumns.push(col);
      }
    });

    // Add any columns that weren't in the config (new columns that appeared)
    columns.forEach((col) => {
      const key = (col.key || col.dataIndex || "") as string;
      if (key) {
        const existingConfig = columnConfig.find((c) => c.key === key);
        if (!existingConfig && reorderedColumns.indexOf(col) === -1) {
          // New column not in config - add it at the end, visible by default
          reorderedColumns.push(col);
        }
      }
    });

    onColumnsChange(reorderedColumns);
  }, [columnConfig, columns, onColumnsChange]);

  const handleToggleVisibility = (key: string) => {
    setColumnConfig((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleToggleMonthColumns = (visible: boolean) => {
    setColumnConfig((prev) =>
      prev.map((item) =>
        isMonthColumn(item.key) ? { ...item, visible } : item
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (dragIndex !== dropIndex && dragIndex >= 0 && dropIndex >= 0) {
      setColumnConfig((prev) => {
        // Get sorted config to find the actual items
        const sorted = [...prev].sort((a, b) => a.order - b.order);
        const draggedItem = sorted[dragIndex];
        const newSorted = [...sorted];
        newSorted.splice(dragIndex, 1);
        newSorted.splice(dropIndex, 0, draggedItem);
        // Update order numbers
        return newSorted.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    localStorage.setItem(storageKey, JSON.stringify(columnConfig));
    setIsModalVisible(false);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    // Reload from localStorage on cancel
    const savedConfig = localStorage.getItem(storageKey);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setColumnConfig(parsed);
      } catch (e) {
        console.warn("Failed to parse saved column config:", e);
      }
    }
    setIsModalVisible(false);
  };

  // Get sorted config for display
  const sortedConfig = useMemo(
    () => [...columnConfig].sort((a, b) => a.order - b.order),
    [columnConfig]
  );

  return (
    <>
      <Button
        type="default"
        icon={<SettingOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          setIsModalVisible(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        size="small"
      >
        Configure Columns
      </Button>
      <Modal
        title="Configure Columns"
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={600}
        okText="Save"
        cancelText="Cancel"
        style={{ maxHeight: "80vh" }}
        bodyStyle={{
          maxHeight: "calc(80vh - 110px)",
          overflowY: "auto",
          padding: "16px 24px",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Space
            direction="vertical"
            style={{ width: "100%" }}
            size="middle"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Text
              type="secondary"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              Drag to reorder columns. Check/uncheck to show/hide columns.
            </Text>
            {monthColumnKeys.length > 0 && (
              <>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    border: "1px solid #d9d9d9",
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Space>
                    <Checkbox
                      checked={areMonthColumnsVisible}
                      onChange={(e) =>
                        handleToggleMonthColumns(e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Text strong>Show Month Columns</Text>
                    </Checkbox>
                  </Space>
                </div>
                <Divider style={{ margin: "8px 0" }} />
              </>
            )}
            <List
              dataSource={sortedConfig}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              renderItem={(item, index) => {
                // Find the actual index in sorted config for drag operations
                const actualIndex = sortedConfig.findIndex(
                  (c) => c.key === item.key
                );
                return (
                  <List.Item
                    key={item.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, actualIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, actualIndex)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      padding: "12px",
                      border: "1px solid #f0f0f0",
                      borderRadius: "4px",
                      marginBottom: "8px",
                      cursor: "move",
                      backgroundColor: "#fff",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                    }}
                  >
                    <Space
                      style={{ width: "100%" }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <HolderOutlined
                        style={{ color: "#999", cursor: "move" }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <Checkbox
                        checked={item.visible}
                        onChange={() => handleToggleVisibility(item.key)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Text
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {item.title}
                        </Text>
                      </Checkbox>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Space>
        </div>
      </Modal>
    </>
  );
};
