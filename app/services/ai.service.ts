import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { systemPrompt } from "../data/prompt";
import { configService } from "./config.service";

export type GenerationResult = {
  query: string;
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
}

export const aiService = AIService.getInstance();
