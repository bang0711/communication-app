import { z } from "zod";

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().default("http://localhost:8000/api"),
  NEXT_PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
});

const env = envSchema.parse(process.env);

export default env;
