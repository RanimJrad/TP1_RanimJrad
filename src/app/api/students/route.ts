import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const publicStudentSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  classe: true,
  observation: true,
  createdAt: true,
} as const;

const optionalSchoolText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(1000).nullable(),
);

const studentSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
    classe: optionalSchoolText.optional(),
    observation: optionalSchoolText.optional(),
  })
  .strict();

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET() {
  const authorization = await requireRole([
    "ADMIN",
    "ENSEIGNANT",
    "ETUDIANT",
  ]);

  if (!authorization.ok) return authorization.response;

  try {
    const students = await prisma.user.findMany({
      where:
        authorization.user.role === "ETUDIANT"
          ? { id: authorization.user.id, role: "ETUDIANT" }
          : { role: "ETUDIANT" },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: publicStudentSelect,
    });

    return NextResponse.json(students);
  } catch {
    return NextResponse.json(
      { message: "Erreur lors de la récupération des étudiants." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireRole(["ADMIN"]);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  const result = studentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { message: "Données invalides. Vérifie les champs du formulaire." },
      { status: 400 },
    );
  }

  try {
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    const student = await prisma.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        password: hashedPassword,
        role: "ETUDIANT",
        classe: result.data.classe ?? null,
        observation: result.data.observation ?? null,
      },
      select: publicStudentSelect,
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "Cette adresse e-mail est déjà utilisée." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Erreur lors de la création de l’étudiant." },
      { status: 500 },
    );
  }
}
