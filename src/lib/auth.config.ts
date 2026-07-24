import type { NextAuthConfig } from "next-auth";

// Edge-compatible config (no Prisma/bcrypt — used in middleware)
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as { role: string }).role = token.role as string;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as { role?: string })?.role;
      const path = request.nextUrl.pathname;
      const isOnDashboard = path.startsWith("/dashboard");
      const isOnMember = path.startsWith("/member");

      if (isOnDashboard) {
        if (!isLoggedIn) return false;
        if (role === "MEMBER") {
          return Response.redirect(new URL("/member", request.nextUrl));
        }
        return true;
      }
      if (isOnMember) {
        if (!isLoggedIn) return false;
        if (role === "ADMIN") {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }
      return true;
    },
  },
  providers: [],
};
