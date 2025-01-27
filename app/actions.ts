"use server";

import { databaseService } from "./services/database.service";
import { aiService, type ChartConfig } from "./services/ai.service";

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
};

export type QueryResult = {
  query: string;
  data: any[];
  chart?: ChartConfig;
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
  query: string,
  question: string
): Promise<ActionResult<QueryResult>> => {
  try {
    const data = await databaseService.executeQuery(query);

    // Generate chart configuration if there's data
    let chart: ChartConfig | undefined;
    if (data.length > 0) {
      try {
        chart = await aiService.generateChartConfig(data, question);
      } catch (error) {
        console.error("Error generating chart config:", error);
        // Don't fail the whole request if chart generation fails
      }
    }

    return {
      success: true,
      data: {
        query,
        data,
        chart,
      },
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
