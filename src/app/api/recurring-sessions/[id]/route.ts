import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface RecurringSession extends RowDataPacket {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const [sessions] = await pool.execute<RecurringSession[]>(
    `SELECT rs.*
     FROM recurring_sessions rs
     WHERE rs.id = ?`,
    [id],
  );

  if (sessions.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(sessions[0]);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete roster entries
    await connection.execute(
      "DELETE FROM roster_students WHERE recurring_session_id = ?",
      [id],
    );

    // Delete recurring session
    await connection.execute("DELETE FROM recurring_sessions WHERE id = ?", [
      id,
    ]);

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting recurring session:", error);
    return NextResponse.json(
      { error: "Failed to delete recurring session" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
