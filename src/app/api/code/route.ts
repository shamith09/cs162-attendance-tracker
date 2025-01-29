import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<RowDataPacket[]>(
      "SELECT is_admin FROM users WHERE email = ?",
      [session.user.email]
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Get the session's expiration seconds
    const [[sessionData]] = await connection.execute<RowDataPacket[]>(
      "SELECT expiration_seconds FROM sessions WHERE id = ?",
      [sessionId]
    );

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const expirationSeconds = sessionData.expiration_seconds;
    const id = uuidv4();
    const code = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationSeconds * 1000);

    await connection.execute(
      "INSERT INTO attendance_codes (id, session_id, code, expires_at) VALUES (?, ?, ?, ?)",
      [id, sessionId, code, expiresAt.toISOString().slice(0, 19).replace("T", " ")]
    );

    return NextResponse.json({ 
      code,
      expiresAt: expiresAt.toISOString()
    });
  } finally {
    connection.release();
  }
}
