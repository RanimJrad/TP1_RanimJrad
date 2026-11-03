"use client";

import { useState, type FormEvent } from "react";
import LogoutButton from "@/components/LogoutButton";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export type DashboardStudent = {
  id: number;
  name: string | null;
  email: string;
  role: "ETUDIANT";
  classe: string | null;
  observation: string | null;
};

type DashboardUser = {
  id: number;
  name: string | null;
  email: string;
  role: Role;
};

type StudentDashboardProps = {
  currentUser: DashboardUser;
  initialStudents: DashboardStudent[];
};

type ApiError = {
  message?: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Ta session a expiré. Reconnecte-toi pour continuer.");
    }
    if (response.status === 403) {
      throw new Error("Tu n’as pas le droit d’effectuer cette action.");
    }
    throw new Error(payload.message ?? "Une erreur est survenue.");
  }

  return payload;
}

export default function StudentDashboard({
  currentUser,
  initialStudents,
}: StudentDashboardProps) {
  const [students, setStudents] = useState(initialStudents);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const canManage = currentUser.role === "ADMIN";
  const canEditPedagogy = currentUser.role === "ENSEIGNANT";
  const canEditStudents = canManage || canEditPedagogy;

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);

    setError(null);
    setNotice(null);
    setPendingAction("create");

    try {
      const created = await readResponse<DashboardStudent>(
        await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.get("name"),
            email: values.get("email"),
            password: values.get("password"),
            classe: values.get("classe"),
            observation: values.get("observation"),
          }),
        }),
      );

      setStudents((current) => [...current, created].sort(compareStudents));
      form.reset();
      setNotice("Le compte étudiant a été créé.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Création impossible.");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitUpdate(
    event: FormEvent<HTMLFormElement>,
    studentId: number,
  ) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const data: Record<string, string> = {
      classe: String(values.get("classe") ?? ""),
      observation: String(values.get("observation") ?? ""),
    };

    if (canManage) {
      data.name = String(values.get("name") ?? "");
      data.email = String(values.get("email") ?? "");
    }

    setError(null);
    setNotice(null);
    setPendingAction(`update-${studentId}`);

    try {
      const updated = await readResponse<DashboardStudent>(
        await fetch(`/api/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );

      setStudents((current) =>
        current.map((student) =>
          student.id === studentId ? updated : student,
        ),
      );
      setNotice("Les informations ont été enregistrées.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Modification impossible.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteStudent(student: DashboardStudent) {
    const label = student.name || student.email;
    if (!window.confirm(`Supprimer le compte étudiant de ${label} ?`)) return;

    setError(null);
    setNotice(null);
    setPendingAction(`delete-${student.id}`);

    try {
      await readResponse<{ message: string }>(
        await fetch(`/api/students/${student.id}`, { method: "DELETE" }),
      );
      setStudents((current) =>
        current.filter((currentStudent) => currentStudent.id !== student.id),
      );
      setNotice("Le compte étudiant a été supprimé.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible.");
    } finally {
      setPendingAction(null);
    }
  }

  async function refreshStudents() {
    setError(null);
    setNotice(null);
    setPendingAction("refresh");
    try {
      const refreshed = await readResponse<DashboardStudent[]>(
        await fetch("/api/students", { cache: "no-store" }),
      );
      setStudents(refreshed);
      setNotice("La liste est à jour.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Actualisation impossible.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
            Espace sécurisé
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Bonjour {currentUser.name || currentUser.email}
          </h1>
          <p className="mt-2 text-slate-600">
            {currentUser.email} · {ROLE_LABELS[currentUser.role]}
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Gestion des étudiants</h2>
            <p className="mt-1 text-sm text-slate-600">
              {currentUser.role === "ADMIN" &&
                "Tu peux créer, modifier et supprimer les comptes étudiants."}
              {currentUser.role === "ENSEIGNANT" &&
                "Tu peux consulter la liste et modifier les informations pédagogiques."}
              {currentUser.role === "ETUDIANT" &&
                "Tu peux consulter uniquement les informations de ton propre compte."}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshStudents}
            disabled={pendingAction !== null}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualiser la liste
          </button>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      {canManage && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-950">
            Créer un compte étudiant
          </h2>
          <form
            onSubmit={submitCreate}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <Field label="Nom complet" name="name" required minLength={2} />
            <Field label="Adresse e-mail" name="email" type="email" required />
            <Field
              label="Mot de passe initial"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Field label="Classe" name="classe" />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
              Observation pédagogique
              <textarea
                name="observation"
                rows={3}
                maxLength={1000}
                className={inputClassName}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pendingAction !== null}
                className={primaryButtonClassName}
              >
                {pendingAction === "create" ? "Création…" : "Créer l’étudiant"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {currentUser.role === "ETUDIANT" ? "Mon profil" : "Liste des étudiants"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {students.length} {students.length > 1 ? "résultats" : "résultat"}
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            Aucun étudiant à afficher.
          </div>
        ) : (
          <div className="grid gap-4">
            {students.map((student) => (
              <article
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                {canEditStudents ? (
                  <form
                    onSubmit={(event) => submitUpdate(event, student.id)}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    {canManage ? (
                      <>
                        <Field
                          label="Nom complet"
                          name="name"
                          required
                          minLength={2}
                          defaultValue={student.name ?? ""}
                        />
                        <Field
                          label="Adresse e-mail"
                          name="email"
                          type="email"
                          required
                          defaultValue={student.email}
                        />
                      </>
                    ) : (
                      <div className="sm:col-span-2">
                        <p className="font-semibold text-slate-900">
                          {student.name || "Nom non renseigné"}
                        </p>
                        <p className="text-sm text-slate-600">{student.email}</p>
                      </div>
                    )}
                    <Field
                      label="Classe"
                      name="classe"
                      defaultValue={student.classe ?? ""}
                    />
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                      Observation pédagogique
                      <textarea
                        name="observation"
                        rows={3}
                        maxLength={1000}
                        defaultValue={student.observation ?? ""}
                        className={inputClassName}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button
                        type="submit"
                        disabled={pendingAction !== null}
                        className={primaryButtonClassName}
                      >
                        {pendingAction === `update-${student.id}`
                          ? "Enregistrement…"
                          : "Enregistrer"}
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => deleteStudent(student)}
                          disabled={pendingAction !== null}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingAction === `delete-${student.id}`
                            ? "Suppression…"
                            : "Supprimer"}
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyValue label="Nom complet" value={student.name} />
                    <ReadOnlyValue label="Adresse e-mail" value={student.email} />
                    <ReadOnlyValue label="Classe" value={student.classe} />
                    <ReadOnlyValue
                      label="Observation pédagogique"
                      value={student.observation}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function compareStudents(a: DashboardStudent, b: DashboardStudent): number {
  return (a.name ?? a.email).localeCompare(b.name ?? b.email, "fr");
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const primaryButtonClassName =
  "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  name,
  type = "text",
  required = false,
  minLength,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className={inputClassName}
      />
    </label>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
        {value?.trim() || "Non renseigné"}
      </p>
    </div>
  );
}
