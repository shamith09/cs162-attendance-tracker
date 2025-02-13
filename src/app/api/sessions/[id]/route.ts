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

  const [[sessionData]] = await pool.execute<SessionRecord[]>(
    "SELECT * FROM sessions WHERE id = ?",
    [id],
  );

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(sessionData);
}

export async function PUT(
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

  await pool.execute(
    "UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id],
  );

  const [[updatedSession]] = await pool.execute<SessionRecord[]>(
    "SELECT * FROM sessions WHERE id = ?",
    [id],
  );

  return NextResponse.json(updatedSession);
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

  // Delete related records first
  await pool.execute("DELETE FROM attendance_records WHERE session_id = ?", [
    id,
  ]);
  await pool.execute("DELETE FROM attendance_codes WHERE session_id = ?", [id]);
  await pool.execute("DELETE FROM sessions WHERE id = ?", [id]);

  return NextResponse.json({ success: true });
}

export async function PATCH(
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

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    await pool.execute("UPDATE sessions SET name = ? WHERE id = ?", [name, id]);

    const [[updatedSession]] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, u.name as creator_name, u.email as creator_email 
       FROM sessions s
       JOIN users u ON s.created_by = u.id
       WHERE s.id = ?`,
      [id],
    );

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error renaming session:", error);
    return NextResponse.json(
      { error: "Failed to rename session" },
      { status: 500 },
    );
  }
}
