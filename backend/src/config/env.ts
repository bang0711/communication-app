import { z } from "zod";

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
  PORT: z.coerce.number().min(1000),
  HOST: z.string().default("localhost"),
  PROTOCOL: z.enum(["http", "https"]).default("http"),
  BASE_URL: z.string().default("http://localhost:8000"),
  ACCEPTED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001"),
  DATABASE_URL: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
});

const env = envSchema.parse(process.env);

export default env;
