"use server";

import { databaseService } from "./services/database.service";
import { aiService } from "./services/ai.service";

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
};

export const generateQuery = async (
  input: string
): Promise<ActionResult<string>> => {
  try {
    const result = await aiService.generateQuery(input);
    return {
      success: true,
      data: result.query,
    };
  } catch (error: any) {
    console.error("Error generating query:", error);
    return {
      success: false,
      error: {
        message: error.message || "Failed to generate query",
        code: error.code || "UNKNOWN_ERROR",
      },
    };
  }
};

export const runGeneratedSQLQuery = async (
  query: string
): Promise<ActionResult<any[]>> => {
  try {
    const data = await databaseService.executeQuery(query);
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("Error executing query:", error);
    return {
      success: false,
      error: {
        message: error.message || "Failed to execute query",
        code: error.code || "UNKNOWN_ERROR",
      },
    };
  }
};
