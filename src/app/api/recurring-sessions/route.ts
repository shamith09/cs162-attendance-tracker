import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface StudentInfo {
  name: string;
  email: string;
}

function formatName(fullName: string): string {
  const names = fullName.trim().split(/\s+/);
  if (names.length <= 2) return fullName.trim();
  return `${names[0]} ${names[names.length - 1]}`;
}

function parseStudentLine(line: string): StudentInfo | null {
  // Try tab-separated first
  let parts = line.split("\t");
  if (parts.length >= 2) {
    return { name: formatName(parts[0]), email: parts[1].trim() };
  }

  // Try comma-separated with angle brackets
  const angleMatch = line.match(/^([^<]+)<([^>]+)>/);
  if (angleMatch) {
    return { name: formatName(angleMatch[1]), email: angleMatch[2].trim() };
  }

  // Try comma-separated
  parts = line.split(",");
  if (parts.length >= 2) {
    return { name: formatName(parts[0]), email: parts[1].trim() };
  }

  return null;
}

interface RecurringSession extends RowDataPacket {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  student_count: number;
}

export async function GET() {
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
    `SELECT rs.*, COUNT(DISTINCT rst.user_id) as student_count
     FROM recurring_sessions rs
     LEFT JOIN roster_students rst ON rs.id = rst.recurring_session_id
     GROUP BY rs.id
     ORDER BY rs.created_at DESC`,
  );

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
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

  const { name, studentNames } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Create recurring session
    const sessionId = uuidv4();
    await connection.execute(
      "INSERT INTO recurring_sessions (id, name, created_by) VALUES (?, ?, ?)",
      [sessionId, name, user.id],
    );

    // Add students to roster
    if (studentNames && studentNames.length > 0) {
      for (const studentName of studentNames) {
        const studentInfo = parseStudentLine(studentName);
        if (!studentInfo) continue;

        // Find or create user
        const [users] = await connection.execute<
          (RowDataPacket & { id: string })[]
        >("SELECT id FROM users WHERE email = ? OR name = ?", [
          studentInfo.email,
          studentInfo.name,
        ]);

        let userId: string;
        if (users.length === 0) {
          userId = uuidv4();
          await connection.execute(
            "INSERT INTO users (id, name, email, is_admin) VALUES (?, ?, ?, FALSE)",
            [userId, studentInfo.name, studentInfo.email],
          );
        } else {
          userId = users[0].id;
        }

        // Add to roster
        await connection.execute(
          "INSERT INTO roster_students (id, recurring_session_id, user_id) VALUES (?, ?, ?)",
          [uuidv4(), sessionId, userId],
        );
      }
    }

    await connection.commit();

    const [[newSession]] = await connection.execute<RecurringSession[]>(
      `SELECT rs.*, COUNT(DISTINCT rst.user_id) as student_count
       FROM recurring_sessions rs
       LEFT JOIN roster_students rst ON rs.id = rst.recurring_session_id
       WHERE rs.id = ?
       GROUP BY rs.id`,
      [sessionId],
    );

    return NextResponse.json(newSession);
  } catch (error) {
    await connection.rollback();
    console.error("Error creating recurring session:", error);
    return NextResponse.json(
      { error: "Failed to create recurring session" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
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
