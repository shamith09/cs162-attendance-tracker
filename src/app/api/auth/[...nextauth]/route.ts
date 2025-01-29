import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

const TEST_USERS = {
  'admin@test.com': {
    id: 'test-admin',
    name: 'Test Admin',
    email: 'admin@test.com',
    isAdmin: true,
  },
  'student@test.com': {
    id: 'test-student',
    name: 'Test Student',
    email: 'student@test.com',
    isAdmin: false,
  },
};

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    ...(process.env.NODE_ENV === 'development'
      ? [
          CredentialsProvider({
            name: 'Test Users',
            credentials: {
              email: { type: 'text' },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              return TEST_USERS[credentials.email as keyof typeof TEST_USERS] || null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        const connection = await pool.getConnection();
        try {
          // First check if user exists with this email
          const [existingUsers] = await connection.execute<RowDataPacket[]>(
            "SELECT id FROM users WHERE email = ?",
            [user.email]
          );

          if (existingUsers.length > 0) {
            // User exists, use their existing ID
            user.id = existingUsers[0].id;
          }

          // Update or insert user
          await connection.execute(
            "INSERT INTO users (id, email, name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?",
            [user.id, user.email, user.name, user.name]
          );
          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        } finally {
          connection.release();
        }
      }
      if (account?.provider === "credentials") {
        return true;
      }
      return false;
    },
    async session({ session }) {
      if (session.user?.email) {
        if (process.env.NODE_ENV === 'development') {
          const testUser = TEST_USERS[session.user.email as keyof typeof TEST_USERS];
          if (testUser) {
            session.user.isAdmin = testUser.isAdmin;
            return session;
          }
        }

        const connection = await pool.getConnection();
        try {
          const [rows] = await connection.execute<(RowDataPacket & { is_admin: boolean })[]>(
            "SELECT is_admin FROM users WHERE email = ?",
            [session.user.email]
          );
          session.user.isAdmin = rows[0]?.is_admin || false;
        } finally {
          connection.release();
        }
      }
      return session;
    }
  },
});

export { handler as GET, handler as POST };
