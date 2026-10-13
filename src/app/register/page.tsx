import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="flex flex-col items-center gap-4 pt-24">
      <h1 className="text-2xl font-bold">Créer un compte</h1>

      <AuthForm mode="register" />

      <p className="text-sm">
        Déjà inscrit ?{" "}
        <Link
          href="/login"
          className="text-blue-600 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </main>
  );
}