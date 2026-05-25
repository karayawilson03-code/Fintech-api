import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

// Generate member number e.g. HYR-2026-0001
const generateMemberNumber = async (): Promise<string> => {
  const count = await prisma.member.count();
  const year = new Date().getFullYear();
  const padded = String(count + 1).padStart(4, "0");
  return `${SACCO_CONFIG.memberNumberPrefix}-${year}-${padded}`;
};

// Generate JWT token
const generateToken = (memberId: string, role: string): string => {
  return jwt.sign({ memberId, role }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
};

export const registerMember = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  kraPin?: string;
  employer?: string;
  password: string;
  nextOfKin: {
    fullName: string;
    relationship: string;
    phone: string;
    nationalId: string;
  };
}) => {
  // Check duplicates
  const existing = await prisma.member.findFirst({
    where: {
      OR: [
        { email: data.email },
        { phone: data.phone },
        { nationalId: data.nationalId },
      ],
    },
  });

  if (existing) {
    if (existing.email === data.email)
      throw new Error("Email already registered");
    if (existing.phone === data.phone)
      throw new Error("Phone number already registered");
    if (existing.nationalId === data.nationalId)
      throw new Error("National ID already registered");
  }

  const memberNumber = await generateMemberNumber();
  const hashedPassword = await bcrypt.hash(data.password, 12);

  const member = await prisma.member.create({
    data: {
      memberNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      nationalId: data.nationalId,
      kraPin: data.kraPin,
      employer: data.employer,
      password: hashedPassword,
      nextOfKin: {
        create: {
          fullName: data.nextOfKin.fullName,
          relationship: data.nextOfKin.relationship,
          phone: data.nextOfKin.phone,
          nationalId: data.nextOfKin.nationalId,
        },
      },
    },
    include: { nextOfKin: true },
  });

  const token = generateToken(member.id, member.role);

  return {
    token,
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: member.status,
      nextOfKin: member.nextOfKin,
      joinedAt: member.joinedAt,
    },
  };
};

export const loginMember = async (data: {
  email: string;
  password: string;
}) => {
  const member = await prisma.member.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!member) throw new Error("Invalid email or password");

  if (member.status === "SUSPENDED") {
    throw new Error(
      "Your account has been suspended. Contact the SACCO office.",
    );
  }

  if (member.status === "INACTIVE") {
    throw new Error("Your account is inactive. Contact the SACCO office.");
  }

  const isMatch = await bcrypt.compare(data.password, member.password);
  if (!isMatch) throw new Error("Invalid email or password");

  const token = generateToken(member.id, member.role);

  return {
    token,
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: member.status,
    },
  };
};
