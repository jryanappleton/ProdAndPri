import { PrismaClient } from "@prisma/client";
import { resetAndSeedWorkspace } from "@/lib/server/seed-workspace";

const prisma = new PrismaClient();

async function main() {
  await resetAndSeedWorkspace(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
