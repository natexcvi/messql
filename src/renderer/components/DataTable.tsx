import React, { useState, useRef, useCallback, useMemo } from "react";
import { QueryResult } from "../types";
import { exportToCSV, exportToJSON } from "../utils/export";

interface DataTableProps {
  result: QueryResult;
}

interface ColumnState {
  width: number;
  isResizing: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ result }) => {
  const { rows = [], fields = [], rowCount = 0, duration = 0 } = result || {};
  const [columns, setColumns] = useState<Record<string, ColumnState>>(() => {
    const initial: Record<string, ColumnState> = {};
    fields.forEach((field) => {
      initial[field.name] = { width: 150, isResizing: false };
    });
    return initial;
  });
  const [filterText, setFilterText] = useState("");

  const resizeState = useRef<{
    columnName: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, columnName: string) => {
      e.preventDefault();
      e.stopPropagation();

      const currentWidth = columns[columnName]?.width || 150;

      resizeState.current = {
        columnName,
        startX: e.clientX,
        startWidth: currentWidth,
      };

      setColumns((prev) => ({
        ...prev,
        [columnName]: {
          ...prev[columnName],
          width: currentWidth,
          isResizing: true,
        },
      }));

      const handleMouseMove = (e: MouseEvent) => {
        const currentResize = resizeState.current;
        if (!currentResize) return;

        const diff = e.clientX - currentResize.startX;
        const newWidth = Math.max(80, currentResize.startWidth + diff);

        setColumns((prev) => ({
          ...prev,
          [currentResize.columnName]: {
            ...prev[currentResize.columnName],
            width: newWidth,
          },
        }));
      };

      const handleMouseUp = () => {
        const currentResize = resizeState.current;
        if (currentResize) {
          setColumns((prev) => ({
            ...prev,
            [currentResize.columnName]: {
              ...prev[currentResize.columnName],
              isResizing: false,
            },
          }));
        }

        resizeState.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columns],
  );

  const handleExportCSV = useCallback(() => {
    exportToCSV(
      result,
      `query_results_${new Date().toISOString().split("T")[0]}.csv`,
    );
  }, [result]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(
      result,
      `query_results_${new Date().toISOString().split("T")[0]}.json`,
    );
  }, [result]);

  // Filter rows based on filter text
  const filteredRows = useMemo(() => {
    if (!filterText) return rows;

    const lowerFilter = filterText.toLowerCase();
    return rows.filter((row) => {
      return fields.some((field) => {
        const value = row[field.name];
        if (value === null) return false;
        return String(value).toLowerCase().includes(lowerFilter);
      });
    });
  }, [rows, fields, filterText]);

  // Don't render if no fields or result
  if (!result || !fields || fields.length === 0) {
    return (
      <div className="results-container">
        <div className="results-header">
          <div className="results-info">No data to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container" style={{ marginTop: 0, paddingTop: 0 }}>
      <div className="results-header">
        <div className="results-info" data-testid="results-info">
          {rowCount} rows returned in {duration}ms
          {filterText && ` • ${filteredRows.length} filtered`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="text"
            placeholder="Filter results..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              borderRadius: "4px",
              border: "1px solid var(--border-primary)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              minWidth: "150px",
            }}
          />
          <button onClick={handleExportCSV} className="export-btn">
            Export CSV
          </button>
          <button onClick={handleExportJSON} className="export-btn">
            Export JSON
          </button>
        </div>
      </div>

      <div
        className="results-table-container"
        style={{ overflow: "auto", marginTop: 0, paddingTop: 0 }}
      >
        <div className="data-table" style={{ marginTop: 0, paddingTop: 0 }}>
          <table
            data-testid="results-table"
            style={{
              borderCollapse: "collapse",
              width: "max-content",
              borderSpacing: 0,
              marginTop: 0,
            }}
          >
            <thead style={{ borderTop: "2px solid var(--border-primary)" }}>
              <tr style={{ borderTop: "2px solid var(--border-primary)" }}>
                {fields.map((field, index) => {
                  const columnState = columns[field.name] || {
                    width: 150,
                    isResizing: false,
                  };
                  return (
                    <th
                      key={field.name}
                      className="data-table-header"
                      style={{
                        width: columnState.width,
                        minWidth: columnState.width,
                        maxWidth: columnState.width,
                        backgroundColor: columnState.isResizing
                          ? "var(--accent-secondary)"
                          : "var(--bg-secondary)",
                        position: "sticky",
                        top: -1,
                        zIndex: 20,
                        border: "1px solid var(--border-primary)",
                        borderTop: "2px solid var(--border-primary)",
                        margin: 0,
                        padding: "10px 12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {field.name}
                      {(index < fields.length - 1 || fields.length === 1) && (
                        <div
                          style={{
                            position: "absolute",
                            right: -2,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            cursor: "col-resize",
                            backgroundColor: columnState.isResizing
                              ? "#3b82f6"
                              : "transparent",
                            zIndex: 11,
                          }}
                          onMouseDown={(e) => handleMouseDown(e, field.name)}
                          onMouseEnter={(e) => {
                            if (!resizeState.current) {
                              (e.target as HTMLElement).style.backgroundColor =
                                "#3b82f6";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!resizeState.current) {
                              (e.target as HTMLElement).style.backgroundColor =
                                "transparent";
                            }
                          }}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {fields.map((field) => {
                    const columnState = columns[field.name] || {
                      width: 150,
                      isResizing: false,
                    };
                    return (
                      <td
                        key={field.name}
                        style={{
                          width: columnState.width,
                          minWidth: columnState.width,
                          maxWidth: columnState.width,
                          border: "1px solid #f3f4f6",
                          padding: "6px 12px",
                          fontSize: "12px",
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row[field.name] === null ? (
                          <span
                            style={{
                              color: "#9ca3af",
                              fontStyle: "italic",
                              fontSize: "11px",
                            }}
                          >
                            NULL
                          </span>
                        ) : typeof row[field.name] === "object" ? (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "11px",
                            }}
                          >
                            {JSON.stringify(row[field.name])}
                          </span>
                        ) : (
                          String(row[field.name])
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
