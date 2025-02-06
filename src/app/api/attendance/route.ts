import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface AttendeeRecord extends RowDataPacket {
  user_name: string;
  user_email: string;
  timestamp: string;
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
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const [attendees] = await pool.execute<AttendeeRecord[]>(
    `SELECT u.name as user_name, u.email as user_email, ar.timestamp 
     FROM attendance_records ar 
     JOIN users u ON ar.user_id = u.id 
     WHERE ar.session_id = ? 
     ORDER BY ar.timestamp DESC`,
    [sessionId],
  );

  return NextResponse.json({ attendees });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();
  const validationToken = req.cookies.get("validation_token")?.value;

  if (!validationToken) {
    return NextResponse.json({ error: "Invalid validation" }, { status: 400 });
  }

  try {
    // Verify validation token and get session_id
    const [validationRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cv.code_id, ac.session_id 
       FROM code_validations cv
       JOIN attendance_codes ac ON cv.code_id = ac.id
       WHERE cv.id = ? AND cv.expires_at > NOW() AND ac.code = ?`,
      [validationToken, code],
    );

    if (validationRows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired validation" },
        { status: 400 },
      );
    }

    const { session_id } = validationRows[0];

    // Check if session is still active
    const [sessionRows] = await pool.execute<RowDataPacket[]>(
      "SELECT ended_at FROM sessions WHERE id = ?",
      [session_id],
    );

    if (sessionRows.length === 0 || sessionRows[0].ended_at) {
      return NextResponse.json({ error: "Session ended" }, { status: 400 });
    }

    // Get user ID from email
    const [userRows] = await pool.execute<(RowDataPacket & { id: string })[]>(
      "SELECT id FROM users WHERE email = ?",
      [session.user.email],
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if attendance already marked
    const [attendanceRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM attendance_records WHERE user_id = ? AND session_id = ?",
      [userRows[0].id, session_id],
    );

    if (attendanceRows.length > 0) {
      return NextResponse.json(
        { error: "Attendance already marked" },
        { status: 400 },
      );
    }

    // Mark attendance and delete validation token
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        "INSERT INTO attendance_records (id, user_id, session_id, timestamp) VALUES (?, ?, ?, NOW())",
        [uuidv4(), userRows[0].id, session_id],
      );
      await connection.execute("DELETE FROM code_validations WHERE id = ?", [
        validationToken,
      ]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Clear validation cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("validation_token", "", { maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
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

  const { sessionId, name } = await req.json();

  if (!sessionId || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const connection = await pool.getConnection();
  try {
    // Check if session exists and is active
    const [[sessionData]] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM sessions WHERE id = ? AND ended_at IS NULL",
      [sessionId],
    );

    if (!sessionData) {
      return NextResponse.json(
        { error: "Invalid or ended session" },
        { status: 400 },
      );
    }

    // Find user by name
    const [users] = await connection.execute<
      (RowDataPacket & { id: string })[]
    >("SELECT id FROM users WHERE name = ?", [name]);

    let userId: string;
    if (users.length === 0) {
      // Create new user if not found
      userId = uuidv4();
      await connection.execute(
        "INSERT INTO users (id, name, email, is_admin) VALUES (?, ?, ?, FALSE)",
        [userId, name, ""],
      );
    } else {
      userId = users[0].id;
    }

    // Check if already marked attendance
    const [attendanceRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM attendance_records WHERE user_id = ? AND session_id = ?",
      [userId, sessionId],
    );

    if (attendanceRows.length > 0) {
      return NextResponse.json(
        { error: "Attendance already marked" },
        { status: 400 },
      );
    }

    // Mark attendance directly without creating a code
    await connection.execute(
      "INSERT INTO attendance_records (id, user_id, session_id, timestamp) VALUES (?, ?, ?, NOW())",
      [uuidv4(), userId, sessionId],
    );

    return NextResponse.json({ success: true });
  } finally {
    connection.release();
  }
}
