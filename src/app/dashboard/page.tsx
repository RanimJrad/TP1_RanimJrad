import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isRole } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";
import StudentDashboard, {
  type DashboardStudent,
} from "@/components/StudentDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Compte introuvable</h1>
        <p className="mt-2 text-slate-600">
          Cette session ne correspond plus à un compte actif. Déconnecte-toi,
          puis reconnecte-toi.
        </p>
        <div className="mt-5">
          <LogoutButton />
        </div>
      </main>
    );
  }

  if (!isRole(currentUser.role)) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Rôle de compte invalide</h1>
        <p className="mt-2 text-slate-600">
          Contacte un administrateur pour corriger le rôle associé à ce compte.
        </p>
        <div className="mt-5">
          <LogoutButton />
        </div>
      </main>
    );
  }

  const students = await prisma.user.findMany({
    where:
      currentUser.role === "ETUDIANT"
        ? { id: currentUser.id, role: "ETUDIANT" }
        : { role: "ETUDIANT" },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      classe: true,
      observation: true,
    },
  });

  const dashboardStudents: DashboardStudent[] = students.map((student) => ({
    ...student,
    role: "ETUDIANT",
  }));

  return (
    <StudentDashboard
      currentUser={{
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      }}
      initialStudents={dashboardStudents}
    />
  );
}
