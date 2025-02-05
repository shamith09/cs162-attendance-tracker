import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface SessionRecord extends RowDataPacket {
  id: string;
  name: string;
  created_at: string;
  ended_at: string | null;
  expiration_seconds: number;
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<(RowDataPacket & { id: string; is_admin: boolean })[]>(
      "SELECT id, is_admin FROM users WHERE email = ?",
      [session.user.email]
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sessions] = await connection.execute<(SessionRecord & { creator_name: string; creator_email: string })[]>(
      `SELECT s.*, u.name as creator_name, u.email as creator_email 
       FROM sessions s 
       JOIN users u ON s.created_by = u.id 
       ORDER BY s.created_at DESC`
    );

    return NextResponse.json({ sessions });
  } finally {
    connection.release();
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<RowDataPacket[]>(
      "SELECT id, is_admin FROM users WHERE email = ?",
      [session.user.email]
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, expirationSeconds } = await req.json();
    if (!name || typeof expirationSeconds !== 'number') {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    
    const id = uuidv4();

    await connection.execute(
      "INSERT INTO sessions (id, name, created_by, expiration_seconds) VALUES (?, ?, ?, ?)",
      [id, name, user.id, expirationSeconds]
    );

    const [[newSession]] = await connection.execute<SessionRecord[]>(
      "SELECT * FROM sessions WHERE id = ?",
      [id]
    );

    return NextResponse.json(newSession);
  } finally {
    connection.release();
  }
} 