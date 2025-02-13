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

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[user]] = await pool.execute<RowDataPacket[]>(
    "SELECT is_admin FROM users WHERE email = ?",
    [session.user.email],
  );

  if (!user?.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recurringSessionId = searchParams.get("recurringSessionId");

  let query = `
    SELECT s.*, u.name as creator_name, u.email as creator_email
    FROM sessions s
    JOIN users u ON s.created_by = u.id
  `;

  const params: string[] = [];
  if (recurringSessionId) {
    query += " WHERE s.recurring_session_id = ?";
    params.push(recurringSessionId);
  }

  query += " ORDER BY s.created_at DESC";

  const [sessions] = await pool.execute<RowDataPacket[]>(query, params);

  return NextResponse.json({ sessions });
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
      [session.user.email],
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, expirationValue, expirationUnit, recurringSessionId } =
      await req.json();
    if (!name || typeof expirationValue !== "number" || !expirationUnit) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const expirationSeconds =
      expirationValue *
      (expirationUnit === "hours"
        ? 3600
        : expirationUnit === "minutes"
          ? 60
          : 1);

    const id = uuidv4();

    await connection.execute(
      "INSERT INTO sessions (id, name, created_by, expiration_seconds, recurring_session_id) VALUES (?, ?, ?, ?, ?)",
      [id, name, user.id, expirationSeconds, recurringSessionId || null],
    );

    const [[newSession]] = await connection.execute<SessionRecord[]>(
      `SELECT s.*, u.name as creator_name, u.email as creator_email 
       FROM sessions s
       JOIN users u ON s.created_by = u.id
       WHERE s.id = ?`,
      [id],
    );

    return NextResponse.json(newSession);
  } finally {
    connection.release();
  }
}
