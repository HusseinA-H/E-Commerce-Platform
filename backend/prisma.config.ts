import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables manually for Prisma CLI processes
dotenv.config({ path: path.join(__dirname, '.env') });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'DATABASE_URL environment variable is required for Prisma migrations and client generation.',
  );
}

export default defineConfig({
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url,
  },
});
