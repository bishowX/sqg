import { db } from "../db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { configService } from "./config.service";

// Types for query results and errors
export type QueryResult = Record<string, any>[];
export type DatabaseError = {
  message: string;
  code: string;
  query?: string;
};

// Schema for validating SQL queries
const sqlQuerySchema = z.string().refine(
  (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      normalizedQuery.startsWith("select") &&
      !normalizedQuery.includes("drop") &&
      !normalizedQuery.includes("delete") &&
      !normalizedQuery.includes("insert") &&
      !normalizedQuery.includes("update") &&
      !normalizedQuery.includes("alter") &&
      !normalizedQuery.includes("truncate") &&
      !normalizedQuery.includes("create") &&
      !normalizedQuery.includes("grant") &&
      !normalizedQuery.includes("revoke")
    );
  },
  {
    message: "Only SELECT queries are allowed",
  }
);

export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {
    // Validate database configuration
    const dbFileName = configService.get("DB_FILE_NAME");
    if (!dbFileName) {
      throw new Error("Database file name is not configured");
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async executeQuery(query: string): Promise<QueryResult> {
    try {
      // Validate query
      sqlQuerySchema.parse(query);

      // Log query in development
      if (configService.isDevelopment()) {
        console.log("Executing query:", query);
      }

      // Execute query
      const result = await db.all(sql.raw(query));

      // Log result in development
      if (configService.isDevelopment()) {
        console.log("Query result:", result);
      }

      return result as QueryResult;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw {
          message: "Invalid query",
          code: "VALIDATION_ERROR",
          details: error.errors,
        };
      }

      throw {
        message: "Database query failed",
        code: "DB_ERROR",
        query,
        originalError: error,
      };
    }
  }

  async validateQuery(query: string): Promise<boolean> {
    try {
      sqlQuerySchema.parse(query);
      return true;
    } catch {
      return false;
    }
  }
}

export const databaseService = DatabaseService.getInstance();
