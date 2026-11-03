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

const adminUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    classe: optionalSchoolText.optional(),
    observation: optionalSchoolText.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const teacherUpdateSchema = z
  .object({
    classe: optionalSchoolText.optional(),
    observation: optionalSchoolText.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseStudentId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function findStudent(id: number) {
  const student = await prisma.user.findUnique({
    where: { id },
    select: publicStudentSelect,
  });

  return student?.role === "ETUDIANT" ? student : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const authorization = await requireRole([
    "ADMIN",
    "ENSEIGNANT",
    "ETUDIANT",
  ]);
  if (!authorization.ok) return authorization.response;

  const { id } = await context.params;
  const studentId = parseStudentId(id);
  if (!studentId) {
    return NextResponse.json(
      { message: "Identifiant invalide." },
      { status: 400 },
    );
  }

  // 404 évite de révéler l'existence du compte d'un autre étudiant.
  if (
    authorization.user.role === "ETUDIANT" &&
    authorization.user.id !== studentId
  ) {
    return NextResponse.json(
      { message: "Étudiant introuvable." },
      { status: 404 },
    );
  }

  try {
    const student = await findStudent(studentId);
    if (!student) {
      return NextResponse.json(
        { message: "Étudiant introuvable." },
        { status: 404 },
      );
    }
    return NextResponse.json(student);
  } catch {
    return NextResponse.json(
      { message: "Erreur lors de la récupération de l’étudiant." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authorization = await requireRole(["ADMIN", "ENSEIGNANT"]);
  if (!authorization.ok) return authorization.response;

  const { id } = await context.params;
  const studentId = parseStudentId(id);
  if (!studentId) {
    return NextResponse.json(
      { message: "Identifiant invalide." },
      { status: 400 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    authorization.user.role === "ENSEIGNANT" &&
    typeof body === "object" &&
    body !== null &&
    ("name" in body || "email" in body)
  ) {
    return NextResponse.json(
      { message: "Un enseignant peut modifier uniquement les champs pédagogiques." },
      { status: 403 },
    );
  }

  const schema =
    authorization.user.role === "ADMIN"
      ? adminUpdateSchema
      : teacherUpdateSchema;
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { message: "Données invalides ou champs non autorisés." },
      { status: 400 },
    );
  }

  try {
    const existingStudent = await findStudent(studentId);
    if (!existingStudent) {
      return NextResponse.json(
        { message: "Étudiant introuvable." },
        { status: 404 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: result.data,
      select: publicStudentSelect,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "Cette adresse e-mail est déjà utilisée." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "Erreur lors de la modification de l’étudiant." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const authorization = await requireRole(["ADMIN"]);
  if (!authorization.ok) return authorization.response;

  const { id } = await context.params;
  const studentId = parseStudentId(id);
  if (!studentId) {
    return NextResponse.json(
      { message: "Identifiant invalide." },
      { status: 400 },
    );
  }

  try {
    const student = await findStudent(studentId);
    if (!student) {
      return NextResponse.json(
        { message: "Étudiant introuvable." },
        { status: 404 },
      );
    }

    await prisma.user.delete({ where: { id: studentId } });
    return NextResponse.json({ message: "Étudiant supprimé avec succès." });
  } catch {
    return NextResponse.json(
      { message: "Erreur lors de la suppression de l’étudiant." },
      { status: 500 },
    );
  }
}
