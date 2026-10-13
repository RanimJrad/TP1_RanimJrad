import Link from "next/link";
import AuthForm from "@/components/AuthForm";
 
export default function LoginPage() {
  return (
    <main className="flex flex-col items-center gap-4 pt-24">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <AuthForm mode="login" />
      <Link href="/register">Créer un compte</Link>
    </main>
  );
}
 
// register/page.tsx : identique avec
// mode="register" et un lien vers /login
