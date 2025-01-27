type ColumnType = "number" | "string" | "date" | "boolean";

interface ColumnStats {
  type: ColumnType;
  unique: number;
  nulls: number;
  min?: number | string | Date;
  max?: number | string | Date;
  avg?: number;
  sample: any[];
}

interface DataShape {
  rowCount: number;
  columns: Record<string, ColumnStats>;
}

export function analyzeData(data: any[]): DataShape {
  if (!data.length) return { rowCount: 0, columns: {} };

  const columns: Record<string, ColumnStats> = {};
  const columnNames = Object.keys(data[0]);

  for (const col of columnNames) {
    const values = data.map((row) => row[col]);
    const nonNullValues = values.filter((v) => v != null);
    const uniqueValues = new Set(values);

    // Determine column type
    const type = inferColumnType(nonNullValues);

    // Calculate stats based on type
    const stats: ColumnStats = {
      type,
      unique: uniqueValues.size,
      nulls: values.length - nonNullValues.length,
      sample:
        uniqueValues.size > 5
          ? Array.from(uniqueValues).slice(0, 5)
          : Array.from(uniqueValues),
    };

    if (type === "number") {
      const numbers = nonNullValues.map(Number);
      stats.min = Math.min(...numbers);
      stats.max = Math.max(...numbers);
      stats.avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    } else if (type === "date") {
      const dates = nonNullValues.map((d) => new Date(d));
      stats.min = new Date(Math.min(...dates.map((d) => d.getTime())));
      stats.max = new Date(Math.max(...dates.map((d) => d.getTime())));
    }

    columns[col] = stats;
  }

  return {
    rowCount: data.length,
    columns,
  };
}

function inferColumnType(values: any[]): ColumnType {
  if (!values.length) return "string";

  const sample = values[0];
  if (typeof sample === "number") return "number";
  if (typeof sample === "boolean") return "boolean";

  // Check if it's a date
  if (!isNaN(Date.parse(sample))) return "date";

  return "string";
}
