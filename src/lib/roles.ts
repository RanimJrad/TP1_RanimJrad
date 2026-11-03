export const ROLES = ["ADMIN", "ENSEIGNANT", "ETUDIANT"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  ENSEIGNANT: "Enseignant",
  ETUDIANT: "Étudiant",
};
