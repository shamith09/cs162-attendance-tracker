import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { RosterStudent } from "@/types";

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

  const [students] = await pool.execute<RosterStudent[]>(
    `SELECT u.id, u.name, u.email, rst.added_at
     FROM roster_students rst
     JOIN users u ON rst.user_id = u.id
     WHERE rst.recurring_session_id = ?
     ORDER BY u.name`,
    [id],
  );

  return NextResponse.json({ students });
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

  const { studentNames } = await req.json();
  if (!studentNames || !Array.isArray(studentNames)) {
    return NextResponse.json(
      { error: "Student names are required" },
      { status: 400 },
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Remove all existing students
    await connection.execute(
      "DELETE FROM roster_students WHERE recurring_session_id = ?",
      [id],
    );

    // Add new students
    for (const line of studentNames) {
      const studentInfo = parseStudentLine(line);
      if (!studentInfo) continue;

      // Find or create user
      const [users] = await connection.execute<
        (RowDataPacket & { id: string })[]
      >("SELECT id FROM users WHERE email = ?", [studentInfo.email]);

      let userId: string;
      if (users.length === 0) {
        userId = uuidv4();
        await connection.execute(
          "INSERT INTO users (id, name, email, is_admin) VALUES (?, ?, ?, FALSE)",
          [userId, studentInfo.name, studentInfo.email],
        );
      } else {
        userId = users[0].id;
        // Update name if it has changed
        await connection.execute("UPDATE users SET name = ? WHERE id = ?", [
          studentInfo.name,
          userId,
        ]);
      }

      // Add to roster
      await connection.execute(
        "INSERT INTO roster_students (id, recurring_session_id, user_id) VALUES (?, ?, ?)",
        [uuidv4(), id, userId],
      );
    }

    await connection.commit();

    const [students] = await connection.execute<RosterStudent[]>(
      `SELECT u.id, u.name, u.email, rst.added_at
       FROM roster_students rst
       JOIN users u ON rst.user_id = u.id
       WHERE rst.recurring_session_id = ?
       ORDER BY u.name`,
      [id],
    );

    return NextResponse.json({ students });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating roster:", error);
    return NextResponse.json(
      { error: "Failed to update roster" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}

export async function POST(
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

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if user is already in roster
    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM roster_students WHERE recurring_session_id = ? AND user_id = ?",
      [id, userId],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Student is already in the roster" },
        { status: 400 },
      );
    }

    // Add to roster
    await connection.execute(
      "INSERT INTO roster_students (id, recurring_session_id, user_id) VALUES (?, ?, ?)",
      [uuidv4(), id, userId],
    );

    await connection.commit();

    const [students] = await connection.execute<RosterStudent[]>(
      `SELECT u.id, u.name, u.email, rst.added_at
       FROM roster_students rst
       JOIN users u ON rst.user_id = u.id
       WHERE rst.recurring_session_id = ?
       ORDER BY u.name`,
      [id],
    );

    return NextResponse.json({ students });
  } catch (error) {
    await connection.rollback();
    console.error("Error adding to roster:", error);
    return NextResponse.json(
      { error: "Failed to add to roster" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
