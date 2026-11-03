import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isRole, type Role } from "@/lib/roles";

export type AuthUser = {
  id: number;
  role: Role;
};

export type RequireRoleResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

function errorResponse(message: string, status: number): RequireRoleResult {
  return {
    ok: false,
    response: NextResponse.json({ message }, { status }),
  };
}

/** Vérifie le JWT, relit le rôle dans la base, puis applique la liste autorisée. */
export async function requireRole(
  rolesAutorises: readonly Role[],
): Promise<RequireRoleResult> {
  try {
    const session = await getSession();

    if (!session) {
      return errorResponse("Session absente, invalide ou expirée.", 401);
    }

    const databaseUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!databaseUser) {
      return errorResponse("Session invalide.", 401);
    }

    if (!isRole(databaseUser.role) || !rolesAutorises.includes(databaseUser.role)) {
      return errorResponse("Accès interdit pour ce rôle.", 403);
    }

    return {
      ok: true,
      user: { id: databaseUser.id, role: databaseUser.role },
    };
  } catch {
    return errorResponse("Impossible de vérifier les autorisations.", 500);
  }
}
