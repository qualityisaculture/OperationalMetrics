import React, { useState, useCallback, useEffect } from "react";

// Resizable title component for table headers
export const ResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props;
  const [resizing, setResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizing) {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      onResize({ width: newWidth });
    }
  };

  const handleMouseUp = () => {
    setResizing(false);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing]);

  return (
    <th
      {...restProps}
      style={{
        position: "relative",
        cursor: resizing ? "col-resize" : "default",
        userSelect: "none",
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
          backgroundColor: resizing ? "#1890ff" : "transparent",
        }}
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};

// Custom hook for managing resizable columns
export const useResizableColumns = (initialColumns: any[]) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const widths: Record<string, number> = {};
      initialColumns.forEach((col) => {
        if (col.width) {
          widths[col.key] = col.width;
        }
      });
      return widths;
    }
  );

  const handleResize = useCallback((columnKey: string, newWidth: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnKey]: Math.max(50, newWidth), // Minimum width of 50px
    }));
  }, []);

  const getResizableColumns = useCallback(
    (columns: any[]) => {
      return columns.map((col) => ({
        ...col,
        width: columnWidths[col.key] || col.width || 150,
        onHeaderCell: () => ({
          width: columnWidths[col.key] || col.width || 150,
          onResize: ({ width }: { width: number }) =>
            handleResize(col.key, width),
        }),
      }));
    },
    [columnWidths, handleResize]
  );

  return { getResizableColumns };
};
