import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { verifyPassword } from "../domain/password";

export const authOptions: NextAuthOptions = {
  secret: serverEnvironment.NEXTAUTH_SECRET ?? "development-only-tindahan-secret-change-me",
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/sign-in" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        if (serverEnvironment.demoMode) {
          return email === serverEnvironment.DEMO_EMAIL && password === serverEnvironment.DEMO_PASSWORD
            ? { id: "demo-owner", email, name: "Rosa Santos" }
            : null;
        }

        const user = await database().user.findUnique({ where: { email } });
        if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) session.user.id = token.userId;
      return session;
    },
  },
};
