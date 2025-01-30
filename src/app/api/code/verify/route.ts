import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    // Check if code exists and is not expired for an active session
    const [codeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT ac.id, ac.session_id 
       FROM attendance_codes ac
       JOIN sessions s ON ac.session_id = s.id
       WHERE ac.code = ?
       AND ac.expires_at > NOW()
       AND s.ended_at IS NULL`,
      [code]
    );

    if (codeRows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
} 