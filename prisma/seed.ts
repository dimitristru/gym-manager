import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gym.local" },
    update: {},
    create: {
      email: "admin@gym.local",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed complete. Admin user:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
