import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  const { code } = await req.json();

  const connection = await pool.getConnection();
  try {
    // Get session ID from code
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
      [code]
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
      [validationToken, codeRows[0].id, validationExpiry]
    );

    // Set validation token in httpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('validation_token', validationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: validationExpiry
    });

    return response;
  } catch (error) {
    console.error("Error validating code:", error);
    return NextResponse.json(
      { error: "Failed to validate code" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
