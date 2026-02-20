import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ensureCustomerForEmail } from "@/lib/stripe";

const DEFAULT_DEV_SECRET = "your-development-secret-key";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET?.trim() || "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (IS_PRODUCTION && (!NEXTAUTH_SECRET || NEXTAUTH_SECRET === DEFAULT_DEV_SECRET)) {
  throw new Error(
    "FATAL: NEXTAUTH_SECRET must be set to a strong non-default value in production."
  );
}

export const authOptions: NextAuthOptions = {
  providers: (() => {
    const providers = [];

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
      );
    }

    return providers;
  })(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/",
    error: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user.id as string) || (token.sub as string);
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (!token.stripeCustomerId && token.email && process.env.STRIPE_SECRET_KEY) {
        const customer = await ensureCustomerForEmail(
          token.email,
          typeof token.name === "string" ? token.name : undefined
        ).catch(() => null);
        if (customer) token.stripeCustomerId = customer.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.stripeCustomerId) {
          session.user.stripeCustomerId = token.stripeCustomerId;
        }
      }
      return session;
    },
  },
  secret: NEXTAUTH_SECRET || DEFAULT_DEV_SECRET,
};
