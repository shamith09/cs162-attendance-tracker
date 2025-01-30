import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface SessionRecord extends RowDataPacket {
  id: string;
  name: string;
  created_at: string;
  ended_at: string | null;
  expiration_minutes: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[user]] = await pool.execute<RowDataPacket[]>(
    "SELECT is_admin FROM users WHERE email = ?",
    [session.user.email]
  );

  if (!user?.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[sessionData]] = await pool.execute<SessionRecord[]>(
    "SELECT * FROM sessions WHERE id = ?",
    [id]
  );

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(sessionData);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[user]] = await pool.execute<RowDataPacket[]>(
    "SELECT is_admin FROM users WHERE email = ?",
    [session.user.email]
  );

  if (!user?.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await pool.execute(
    "UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );

  const [[updatedSession]] = await pool.execute<SessionRecord[]>(
    "SELECT * FROM sessions WHERE id = ?",
    [id]
  );

  return NextResponse.json(updatedSession);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[user]] = await pool.execute<RowDataPacket[]>(
    "SELECT is_admin FROM users WHERE email = ?",
    [session.user.email]
  );

  if (!user?.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete related records first
  await pool.execute(
    "DELETE FROM attendance_records WHERE session_id = ?",
    [id]
  );
  await pool.execute(
    "DELETE FROM attendance_codes WHERE session_id = ?",
    [id]
  );
  await pool.execute(
    "DELETE FROM sessions WHERE id = ?",
    [id]
  );

  return NextResponse.json({ success: true });
} 