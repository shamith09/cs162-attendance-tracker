import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
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

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    // Check if attendance record exists
    const [records] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM attendance_records WHERE user_id = ? AND session_id = ?",
      [userId, sessionId],
    );

    if (records.length > 0) {
      return NextResponse.json(
        { error: "Student is already marked as present" },
        { status: 400 },
      );
    }

    // Create excused absence record
    await connection.execute(
      "INSERT INTO attendance_records (id, user_id, session_id, timestamp, is_excused) VALUES (?, ?, ?, NOW(), TRUE)",
      [uuidv4(), userId, sessionId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error excusing absence:", error);
    return NextResponse.json(
      { error: "Failed to excuse absence" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
