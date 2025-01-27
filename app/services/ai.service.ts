import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { systemPrompt, generateChartPrompt } from "../data/prompt";
import { configService } from "./config.service";
import { analyzeData } from "../utils/data-analysis";

export type GenerationResult = {
  query: string;
};

export type ChartDataValue = number | string | Date;

// Shadcn chart types
export type ChartDataset = {
  name: string;
  data: number[];
  legend?: string;
  color?: string; // Custom color for this dataset
  type?: "bar" | "line" | "area" | "scatter"; // Allow mixed chart types
  stack?: string; // For stacked charts
  yAxisId?: string; // For multiple y-axes
  // Line & Area specific
  curved?: boolean; // Smooth curves
  fill?: boolean; // Fill area under line
  // Bar specific
  borderRadius?: number;
  // Point specific
  pointStyle?: "circle" | "rect" | "star" | "triangle" | "cross";
  pointSize?: number;
};

export type ChartConfig = {
  type: "bar" | "line" | "area" | "scatter" | "mixed";
  options: {
    title: string;
    subtitle?: string;
    stacked?: boolean;
    theme?: {
      background?: string;
      gridColor?: string;
      fontFamily?: string;
      colors?: string[]; // Color palette
    };
    animation?: {
      duration?: number;
      easing?: "linear" | "easeInOut" | "easeIn" | "easeOut";
    };
    xAxis: {
      key: string;
      label: string;
      formatFn?: string;
      grid?: boolean;
      min?: number;
      max?: number;
      tickRotation?: number;
    };
    yAxis: {
      key: string;
      label: string;
      formatFn?: string;
      grid?: boolean;
      min?: number;
      max?: number;
      id?: string;
      position?: "left" | "right";
    }[];
    tooltip?: {
      enabled?: boolean;
      shared?: boolean;
      formatFn?: string;
    };
    legend?: {
      position?: "top" | "right" | "bottom" | "left";
      align?: "start" | "center" | "end";
    };
  };
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
};

export type GenerationError = {
  message: string;
  code: string;
  input?: string;
};

export class AIService {
  private static instance: AIService;

  private constructor() {
    // OpenAI API key is optional in development for mock/test purposes
    if (configService.isProduction() && !configService.get("OPENAI_API_KEY")) {
      throw new Error("OpenAI API key is required in production");
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateQuery(input: string): Promise<GenerationResult> {
    try {
      // Log input in development
      if (configService.isDevelopment()) {
        console.log("Generating query for input:", input);
      }

      // In development without API key, return a mock query
      if (
        configService.isDevelopment() &&
        !configService.get("OPENAI_API_KEY")
      ) {
        return {
          query: "SELECT * FROM tracks LIMIT 5",
        };
      }

      const result = await generateObject({
        model: openai("gpt-4"),
        system: systemPrompt,
        prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
        schema: z.object({
          query: z.string(),
        }),
      });

      // Log result in development
      if (configService.isDevelopment()) {
        console.log("Generated query:", result.object.query);
      }

      return {
        query: result.object.query,
      };
    } catch (error) {
      throw {
        message: "Failed to generate query",
        code: "GENERATION_ERROR",
        input,
        originalError: error,
      };
    }
  }

  async generateChartConfig(
    data: any[],
    question: string
  ): Promise<ChartConfig> {
    try {
      // Log input in development
      if (configService.isDevelopment()) {
        console.log("Generating chart config for data:", data);
      }

      // In development without API key, return a mock chart config
      if (
        configService.isDevelopment() &&
        !configService.get("OPENAI_API_KEY")
      ) {
        return {
          type: "bar",
          options: {
            title: "Sample Chart",
            xAxis: {
              key: "category",
              label: "Category",
            },
            yAxis: [
              {
                key: "value",
                label: "Value",
              },
            ],
          },
          data: {
            labels: ["A", "B", "C"],
            datasets: [
              {
                name: "Sample",
                data: [10, 20, 30],
              },
            ],
          },
        };
      }

      // Analyze data shape and get a small sample
      const dataShape = analyzeData(data);
      const sampleSize = Math.min(3, data.length);
      const sampleData = data.slice(0, sampleSize);

      // Get chart structure from LLM
      const result = await generateObject({
        model: openai("gpt-4"),
        system: systemPrompt,
        prompt: generateChartPrompt(dataShape, sampleData, question),
        schema: z.object({
          type: z.enum(["bar", "line", "area", "scatter", "mixed"]),
          options: z.object({
            title: z.string(),
            subtitle: z.string().optional(),
            stacked: z.boolean().optional(),
            theme: z
              .object({
                background: z.string().optional(),
                gridColor: z.string().optional(),
                fontFamily: z.string().optional(),
                colors: z.array(z.string()).optional(),
              })
              .optional(),
            animation: z
              .object({
                duration: z.number().optional(),
                easing: z
                  .enum(["linear", "easeInOut", "easeIn", "easeOut"])
                  .optional(),
              })
              .optional(),
            xAxis: z.object({
              key: z.string(),
              label: z.string(),
              formatFn: z.string().optional(),
              grid: z.boolean().optional(),
              min: z.number().optional(),
              max: z.number().optional(),
              tickRotation: z.number().optional(),
            }),
            yAxis: z.array(
              z.object({
                key: z.string(),
                label: z.string(),
                formatFn: z.string().optional(),
                grid: z.boolean().optional(),
                min: z.number().optional(),
                max: z.number().optional(),
                id: z.string().optional(),
                position: z.enum(["left", "right"]).optional(),
              })
            ),
            tooltip: z
              .object({
                enabled: z.boolean().optional(),
                shared: z.boolean().optional(),
                formatFn: z.string().optional(),
              })
              .optional(),
            legend: z
              .object({
                position: z.enum(["top", "right", "bottom", "left"]).optional(),
                align: z.enum(["start", "center", "end"]).optional(),
              })
              .optional(),
          }),
          dataMapping: z.object({
            labelField: z.string(),
            datasets: z.array(
              z.object({
                name: z.string(),
                valueField: z.string(),
                legend: z.string().optional(),
                color: z.string().optional(),
                type: z.enum(["bar", "line", "area", "scatter"]).optional(),
                stack: z.string().optional(),
                yAxisId: z.string().optional(),
                curved: z.boolean().optional(),
                fill: z.boolean().optional(),
                borderRadius: z.number().optional(),
                pointStyle: z
                  .enum(["circle", "rect", "star", "triangle", "cross"])
                  .optional(),
                pointSize: z.number().optional(),
              })
            ),
          }),
        }),
      });

      // Format functions for different data types
      const formatters: Record<string, (value: any) => string> = {
        currency: (value) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          }).format(value),
        number: (value) =>
          new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(value),
        compactNumber: (value) =>
          new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value),
        date: (value) =>
          new Date(value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        shortDate: (value) =>
          new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        percentage: (value) =>
          new Intl.NumberFormat("en-US", {
            style: "percent",
            minimumFractionDigits: 1,
          }).format(value / 100),
        string: (value) => String(value),
      };

      // Fill in the actual data based on the mapping
      const chartConfig: ChartConfig = {
        type: result.object.type,
        options: {
          ...result.object.options,
          theme: {
            background: "hsl(var(--background))",
            gridColor: "hsl(var(--border))",
            fontFamily: "var(--font-sans)",
            ...result.object.options.theme,
          },
        },
        data: {
          labels: data.map((item) => {
            const value = item[result.object.dataMapping.labelField];
            if (
              result.object.options.xAxis.formatFn &&
              formatters[result.object.options.xAxis.formatFn]
            ) {
              return formatters[result.object.options.xAxis.formatFn](value);
            }
            return String(value);
          }),
          datasets: result.object.dataMapping.datasets.map((dataset) => ({
            name: dataset.name,
            legend: dataset.legend || dataset.name,
            data: data.map((item) => Number(item[dataset.valueField]) || 0),
            color: dataset.color,
            type: dataset.type,
            stack: dataset.stack,
            yAxisId: dataset.yAxisId,
            curved: dataset.curved,
            fill: dataset.fill,
            borderRadius: dataset.borderRadius,
            pointStyle: dataset.pointStyle,
            pointSize: dataset.pointSize,
          })),
        },
      };

      // Log result in development
      if (configService.isDevelopment()) {
        console.log("Generated chart config:", chartConfig);
      }

      return chartConfig;
    } catch (error) {
      throw {
        message: "Failed to generate chart configuration",
        code: "CHART_GENERATION_ERROR",
        input: question,
        originalError: error,
      };
    }
  }
}

export const aiService = AIService.getInstance();
