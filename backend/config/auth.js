
const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

const getAuthConfig = async () => {
  const { PrismaAdapter } = await import("@auth/prisma-adapter");
  const Credentials = (await import("@auth/core/providers/credentials")).default;

  return {
    adapter: PrismaAdapter(prisma),
    providers: [
      Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        return user;
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    }
  },
    secret: process.env.AUTH_SECRET || "fallback_secret_key_change_me_in_production",
    trustHost: true
  };
};

module.exports = { getAuthConfig };
