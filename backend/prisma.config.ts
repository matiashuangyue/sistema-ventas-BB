import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Cargamos el archivo .env manualmente para que Prisma lo vea
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});