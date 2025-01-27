import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DB_FILE_NAME: z.string().default("chinook.db"),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Config = z.infer<typeof configSchema>;

class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    const parsedConfig = configSchema.safeParse({
      DATABASE_URL: process.env.DATABASE_URL,
      DB_FILE_NAME: process.env.DB_FILE_NAME,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    });

    if (!parsedConfig.success) {
      console.error("Configuration validation failed:", parsedConfig.error);
      throw new Error(`Invalid configuration: ${parsedConfig.error.message}`);
    }

    this.config = parsedConfig.data;
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getRequired<K extends keyof Config>(key: K): NonNullable<Config[K]> {
    const value = this.config[key];
    if (value === undefined || value === null) {
      throw new Error(`Required configuration ${key} is not set`);
    }
    return value as NonNullable<Config[K]>;
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === "development";
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === "production";
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === "test";
  }
}

export const configService = ConfigService.getInstance();
