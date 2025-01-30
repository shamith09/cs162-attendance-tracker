import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await pool.getConnection();
  try {
    const [[user]] = await connection.execute<RowDataPacket[]>(
      "SELECT is_admin FROM users WHERE email = ?",
      [session.user.email]
    );

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total sessions
    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM sessions"
    );
    const totalSessions = sessionRows[0].count;

    // Get total unique students
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE"
    );
    const totalStudents = studentRows[0].count;

    // Get average attendance per session
    const [attendanceStats] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT user_id) as student_count,
        session_id
      FROM attendance_records
      GROUP BY session_id`
    );

    const averageAttendance =
      attendanceStats.length > 0
        ? Math.round(
            attendanceStats.reduce(
              (acc: number, curr: RowDataPacket) => acc + curr.student_count,
              0
            ) / attendanceStats.length
          )
        : 0;

    // Get attendance over time (last 7 sessions)
    const [recentSessions] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        s.name,
        COUNT(DISTINCT a.user_id) as attendance_count
      FROM sessions s
      LEFT JOIN attendance_records a ON s.id = a.session_id
      GROUP BY s.id, s.name
      ORDER BY s.created_at DESC
      LIMIT 7`
    );

    const attendanceOverTime = recentSessions.reverse().map((session) => ({
      name: session.name,
      attendance: session.attendance_count,
    }));

    return NextResponse.json({
      totalSessions,
      totalStudents,
      averageAttendance,
      attendanceOverTime,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  } finally {
    connection.release();
  }
}
