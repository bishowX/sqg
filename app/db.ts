import "dotenv/config";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";

const sqlite = new Database(process.env.DB_FILE_NAME!);
export const db = drizzle(sqlite);

interface SchemaDescription {
  schema: {
    tables: TableDefinition[];
    relationships: Relationship[];
  };
}

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  foreign_keys?: ForeignKey[];
}

interface ColumnDefinition {
  name: string;
  type: string;
  primary_key?: boolean;
  not_null?: boolean;
  default?: string | null;
  unique?: boolean;
}

interface ForeignKey {
  columns: string[];
  references: {
    table: string;
    columns: string[];
  };
}

interface Relationship {
  type: "one-to-one" | "one-to-many" | "many-to-many";
  from: string;
  to: string;
  through?: string;
}

export function generateSchemaDescription(): SchemaDescription {
  const schema: SchemaDescription = {
    schema: {
      tables: [],
      relationships: [],
    },
  };

  // Get all user-defined tables
  const tables = sqlite
    .prepare(
      `SELECT name FROM sqlite_master 
       WHERE type = 'table' 
       AND name NOT LIKE 'sqlite_%' 
       AND name NOT LIKE '_drizzle_%'`
    )
    .all() as Array<{ name: string }>;

  for (const { name: tableName } of tables) {
    const tableDef: TableDefinition = {
      name: tableName,
      columns: [],
      foreign_keys: [],
    };

    // Get columns information
    const columns = sqlite
      .prepare(`PRAGMA table_info('${tableName.replace(/'/g, "''")}')`)
      .all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: 0 | 1;
      dflt_value: any;
      pk: 0 | 1;
    }>;

    tableDef.columns = columns.map((col) => ({
      name: col.name,
      type: col.type.toUpperCase(),
      primary_key: col.pk === 1,
      not_null: col.notnull === 1,
      default: col.dflt_value,
      unique: false, // Will be updated below
    }));

    // Detect unique constraints
    const indexes = sqlite
      .prepare(`PRAGMA index_list('${tableName.replace(/'/g, "''")}')`)
      .all() as Array<{ name: string; unique: 0 | 1 }>;

    indexes.forEach((index) => {
      if (index.unique) {
        const indexInfo = sqlite
          .prepare(`PRAGMA index_info('${index.name.replace(/'/g, "''")}')`)
          .all() as Array<{ name: string }>;

        indexInfo.forEach((info) => {
          const column = tableDef.columns.find((c) => c.name === info.name);
          if (column) column.unique = true;
        });
      }
    });

    // Get foreign keys information
    const foreignKeys = sqlite
      .prepare(`PRAGMA foreign_key_list('${tableName.replace(/'/g, "''")}')`)
      .all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
    }>;

    // Group composite foreign keys
    const fkGroups = foreignKeys.reduce((acc, fk) => {
      if (!acc[fk.id]) acc[fk.id] = [];
      acc[fk.id].push(fk);
      return acc;
    }, {} as Record<number, typeof foreignKeys>);

    // Process foreign key groups
    tableDef.foreign_keys = Object.values(fkGroups).map((group) => {
      group.sort((a, b) => a.seq - b.seq);
      return {
        columns: group.map((fk) => fk.from),
        references: {
          table: group[0].table,
          columns: group.map((fk) => fk.to),
        },
      };
    });

    // Add to schema
    schema.schema.tables.push(tableDef);
  }

  // Generate relationships
  schema.schema.tables.forEach((table) => {
    table.foreign_keys?.forEach((fk) => {
      const relationship: Relationship = {
        type: "one-to-many", // Default assumption
        from: `${fk.references.table}.${fk.references.columns.join(",")}`,
        to: `${table.name}.${fk.columns.join(",")}`,
      };

      // Check for many-to-many through tables
      const throughTable = schema.schema.tables.find((t) =>
        t.foreign_keys?.some(
          (ftk) =>
            ftk.references.table === table.name &&
            ftk.references.table === fk.references.table
        )
      );

      if (throughTable) {
        relationship.type = "many-to-many";
        relationship.through = throughTable.name;
      } else {
        // Try to determine one-to-one relationships
        const referencedTable = schema.schema.tables.find(
          (t) => t.name === fk.references.table
        );
        const isPrimaryKey = fk.columns.every((col) =>
          table.columns.some((c) => c.name === col && c.primary_key)
        );

        if (isPrimaryKey && referencedTable) {
          const referencesPrimaryKey = fk.references.columns.every((col) =>
            referencedTable.columns.some((c) => c.name === col && c.primary_key)
          );

          if (referencesPrimaryKey) {
            relationship.type = "one-to-one";
          }
        }
      }

      schema.schema.relationships.push(relationship);
    });
  });

  return schema;
}
