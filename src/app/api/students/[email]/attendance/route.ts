import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ email: string }> },
) {
  const { email: encodedEmail } = await context.params;
  const email = decodeURIComponent(encodedEmail);
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

  // Get attendance history
  const [history] = await pool.execute<RowDataPacket[]>(
    `
    SELECT 
      s.name as session_name,
      s.created_at as session_date,
      ar.timestamp
    FROM attendance_records ar
    JOIN sessions s ON ar.session_id = s.id
    JOIN users u ON ar.user_id = u.id
    WHERE u.email = ?
    ORDER BY ar.timestamp DESC
  `,
    [email],
  );

  // Get total sessions
  const [[{ totalSessions }]] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as totalSessions FROM sessions WHERE ended_at IS NOT NULL",
  );

  // Get attended sessions
  const [[{ attendedSessions }]] = await pool.execute<RowDataPacket[]>(
    `
    SELECT COUNT(DISTINCT ar.session_id) as attendedSessions
    FROM attendance_records ar
    JOIN users u ON ar.user_id = u.id
    WHERE u.email = ?
  `,
    [email],
  );

  // Get attendance by weekday
  const [weekdayData] = await pool.execute<RowDataPacket[]>(
    `
    SELECT 
      DAYNAME(MIN(ar.timestamp)) as name,
      COUNT(*) as count,
      DAYOFWEEK(MIN(ar.timestamp)) as day_number
    FROM attendance_records ar
    JOIN users u ON ar.user_id = u.id
    WHERE u.email = ?
    GROUP BY DAYOFWEEK(ar.timestamp)
    ORDER BY day_number
  `,
    [email],
  );

  // Get attendance timeline
  const [timelineData] = await pool.execute<RowDataPacket[]>(
    `
    SELECT 
      DATE(MIN(ar.timestamp)) as date,
      COUNT(*) as attended
    FROM attendance_records ar
    JOIN users u ON ar.user_id = u.id
    WHERE u.email = ?
    GROUP BY DATE(ar.timestamp)
    ORDER BY date
  `,
    [email],
  );

  // Calculate average arrival time
  const [[{ averageArrivalMinutes }]] = await pool.execute<RowDataPacket[]>(
    `
    SELECT AVG(TIMESTAMPDIFF(MINUTE, s.created_at, ar.timestamp)) as averageArrivalMinutes
    FROM attendance_records ar
    JOIN sessions s ON ar.session_id = s.id
    JOIN users u ON ar.user_id = u.id
    WHERE u.email = ?
  `,
    [email],
  );

  // Fill in missing weekdays with zero counts
  const weekdayMap = new Map(weekdayData.map((d) => [d.name, d.count]));
  const fullWeekdayData = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].map((name) => ({
    name,
    count: weekdayMap.get(name) || 0,
  }));

  const stats = {
    totalSessions,
    attendedSessions,
    attendanceRate: attendedSessions / totalSessions,
    averageArrivalMinutes: Math.round(averageArrivalMinutes || 0),
    attendanceByWeekday: fullWeekdayData,
    attendanceTimeline: timelineData,
  };

  return NextResponse.json({ history, stats });
}
