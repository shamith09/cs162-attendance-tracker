import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<RowDataPacket[]>(
      "SELECT is_admin FROM users WHERE email = ?",
      [session.user.email],
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [admins] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        u.email,
        u.name,
        COUNT(DISTINCT s.id) as sessions_started
      FROM users u
      LEFT JOIN sessions s ON u.id = s.created_by
      WHERE u.is_admin = TRUE
      GROUP BY u.id, u.email, u.name`,
    );

    return NextResponse.json({ admins });
  } finally {
    connection.release();
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<RowDataPacket[]>(
      "SELECT is_admin FROM users WHERE email = ?",
      [session.user.email],
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const [[existingUser]] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUser) {
      await connection.execute(
        "UPDATE users SET is_admin = TRUE, name = COALESCE(?, name) WHERE email = ?",
        [name, email],
      );
    } else {
      const id = uuidv4();
      await connection.execute(
        "INSERT INTO users (id, email, name, is_admin) VALUES (?, ?, ?, TRUE)",
        [id, email, name],
      );
    }

    return NextResponse.json({ success: true });
  } finally {
    connection.release();
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<RowDataPacket[]>(
      "SELECT is_admin FROM users WHERE email = ?",
      [session.user.email],
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (email === session.user.email) {
      return NextResponse.json(
        { error: "Cannot remove yourself as admin" },
        { status: 400 },
      );
    }

    await connection.execute(
      "UPDATE users SET is_admin = FALSE WHERE email = ?",
      [email],
    );

    return NextResponse.json({ success: true });
  } finally {
    connection.release();
  }
}
