import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data first
  await prisma.transaction.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.loanGuarantor.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.share.deleteMany();
  await prisma.saving.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.dividend.deleteMany();
  await prisma.nextOfKin.deleteMany();
  await prisma.member.deleteMany();

  console.log("🗑️  Cleared existing data");

  const password = await bcrypt.hash("Password1", 12);

  const member = await prisma.member.create({
    data: {
      memberNumber: "HYR-2026-0001",
      firstName: "John",
      lastName: "Kamau",
      email: "john.kamau@email.com",
      phone: "+254712345678",
      nationalId: "12345678",
      kraPin: "A123456789Z",
      employer: "Safaricom PLC",
      password,
      nextOfKin: {
        create: {
          fullName: "Jane Kamau",
          relationship: "Spouse",
          phone: "0798765432",
          nationalId: "87654321",
        },
      },
    },
  });

  // Add savings
  await prisma.saving.create({
    data: {
      memberId: member.id,
      amount: 5000,
      balance: 5000,
      type: "DEPOSIT",
      channel: "MPESA",
      reference: "QKA123456",
    },
  });

  // Add shares
  await prisma.share.create({
    data: {
      memberId: member.id,
      units: 10,
      pricePerUnit: 1000,
      totalAmount: 10000,
      type: "PURCHASE",
    },
  });

  // Add transaction
  await prisma.transaction.create({
    data: {
      memberId: member.id,
      amount: 5000,
      type: "SAVINGS_DEPOSIT",
      channel: "MPESA",
      description: "Initial deposit",
      status: "SUCCESS",
    },
  });
  // Add admin member
  const admin = await prisma.member.create({
    data: {
      memberNumber: "HYR-2026-0000",
      firstName: "James",
      lastName: "Mwangi",
      email: "admin@hyraxsacco.co.ke",
      phone: "+254700000000",
      nationalId: "00000001",
      kraPin: "A000000001Z",
      employer: "Hyrax Achievers SACCO",
      password,
      role: "ADMIN",
      nextOfKin: {
        create: {
          fullName: "Mary Mwangi",
          relationship: "Spouse",
          phone: "0700000001",
          nationalId: "00000002",
        },
      },
    },
  });

  console.log(`Admin: ${admin.memberNumber}`);
  console.log("Admin Email: admin@hyraxsacco.co.ke");
  console.log("Admin Password: Password1");
  console.log("✅ Seed complete!");
  console.log(`Member: ${member.memberNumber}`);
  console.log("Email: john.kamau@email.com");
  console.log("Password: Password1");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
