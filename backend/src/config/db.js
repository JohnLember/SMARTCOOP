import { PrismaClient } from "@prisma/client";

// Single Prisma client instance reused across the app.
const prisma = new PrismaClient();

export default prisma;
