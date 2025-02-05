import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  const { code } = await req.json();
  const session = await getServerSession();

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    // If it's a 6-digit code, verify and mark attendance directly
    if (code.length === 6) {
      // Get user ID
      const [[user]] = await connection.execute<
        (RowDataPacket & { id: string })[]
      >("SELECT id FROM users WHERE email = ?", [session.user.email]);

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get active code
      const [codeRows] = await connection.execute<
        (RowDataPacket & {
          id: string;
          session_id: string;
          expires_at: Date;
          created_at: Date;
          code: string;
        })[]
      >(
        `SELECT ac.id, ac.session_id, 
         ac.expires_at,
         ac.created_at,
         ac.code
         FROM attendance_codes ac
         JOIN sessions s ON ac.session_id = s.id
         WHERE LOWER(RIGHT(ac.code, 6)) = LOWER(?)
         AND ac.expires_at > NOW()
         AND s.ended_at IS NULL
         ORDER BY ac.created_at DESC
         LIMIT 1`,
        [code],
      );

      if (codeRows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired code" },
          { status: 400 },
        );
      }

      // Check if attendance already marked
      const [attendanceRows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM attendance_records WHERE user_id = ? AND session_id = ?",
        [user.id, codeRows[0].session_id],
      );

      if (attendanceRows.length > 0) {
        return NextResponse.json(
          { error: "Attendance already marked" },
          { status: 400 },
        );
      }

      // Mark attendance
      await connection.execute(
        "INSERT INTO attendance_records (id, user_id, code_id, session_id, timestamp) VALUES (?, ?, ?, ?, NOW())",
        [uuidv4(), user.id, codeRows[0].id, codeRows[0].session_id],
      );

      return NextResponse.json({ success: true });
    }

    // Otherwise, handle as QR code validation
    const [codeRows] = await connection.execute<
      (RowDataPacket & {
        id: string;
        session_id: string;
      })[]
    >(
      `SELECT ac.id, ac.session_id
       FROM attendance_codes ac 
       JOIN sessions s ON ac.session_id = s.id
       WHERE ac.code = ?`,
      [code],
    );

    if (codeRows.length === 0) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Generate validation token
    const validationToken = uuidv4();
    const validationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store validation token in database
    await connection.execute(
      "INSERT INTO code_validations (id, code_id, expires_at) VALUES (?, ?, ?)",
      [validationToken, codeRows[0].id, validationExpiry],
    );

    // Set validation token in httpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("validation_token", validationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: validationExpiry,
    });

    return response;
  } catch (error) {
    console.error("Error validating code:", error);
    return NextResponse.json(
      { error: "Failed to validate code" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
