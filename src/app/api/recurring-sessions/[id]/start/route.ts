import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[user]] = await pool.execute<(RowDataPacket & { id: string })[]>(
    "SELECT id, is_admin FROM users WHERE email = ?",
    [session.user.email],
  );

  if (!user?.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, expirationSeconds } = await req.json();
  if (!name || typeof expirationSeconds !== "number") {
    return NextResponse.json(
      { error: "Name and expiration seconds are required" },
      { status: 400 },
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get the count of existing sessions for this recurring session
    const [[{ count }]] = await connection.execute<
      (RowDataPacket & { count: number })[]
    >(
      `SELECT COUNT(*) as count 
       FROM sessions 
       WHERE recurring_session_id = ?`,
      [id],
    );

    // Create new session with incremented number
    const newSessionId = uuidv4();
    const sessionNumber = count + 1;
    const sessionName = `${name} ${sessionNumber}`;

    await connection.execute(
      "INSERT INTO sessions (id, name, created_by, expiration_seconds, recurring_session_id) VALUES (?, ?, ?, ?, ?)",
      [newSessionId, sessionName, user.id, expirationSeconds, id],
    );

    await connection.commit();

    const [[newSession]] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM sessions WHERE id = ?",
      [newSessionId],
    );

    return NextResponse.json(newSession);
  } catch (error) {
    await connection.rollback();
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
