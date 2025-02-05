"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface StudentAttendance {
  session_name: string;
  session_date: string;
  timestamp: string;
}

interface AttendanceStats {
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  averageArrivalMinutes: number;
}

export default function StudentDetails({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [studentData, setStudentData] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<
    StudentAttendance[]
  >([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
      return;
    }

    const fetchStudentData = async () => {
      try {
        const [studentRes, historyRes] = await Promise.all([
          fetch(`/api/students/${encodeURIComponent(email)}`),
          fetch(`/api/students/${encodeURIComponent(email)}/attendance`),
        ]);

        if (studentRes.status === 404 || historyRes.status === 404) {
          notFound();
          return;
        }

        if (!studentRes.ok || !historyRes.ok) {
          throw new Error("Failed to fetch student data");
        }

        const [studentData, historyData] = await Promise.all([
          studentRes.json(),
          historyRes.json(),
        ]);

        setStudentData(studentData);
        setAttendanceHistory(historyData.history);
        setStats(historyData.stats);
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [email, session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Student Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="CS 162 Logo" width={40} height={40} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {studentData?.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {studentData?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {Math.round(stats.attendanceRate * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Attendance Rate
                  </p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {stats.attendedSessions} Attended
                    </Badge>
                    <Badge variant="outline">
                      {stats.totalSessions - stats.attendedSessions} Missed
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Average arrival time: {stats.averageArrivalMinutes} minutes
                    after start
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {attendanceHistory.map((record, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-start py-3">
                          <div>
                            <p className="font-medium">{record.session_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                record.session_date,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {new Date(record.timestamp).toLocaleTimeString()}
                            </Badge>
                          </div>
                        </div>
                        {i < attendanceHistory.length - 1 && <Separator />}
                      </div>
                    ))}
                    {attendanceHistory.length === 0 && (
                      <p className="text-center text-muted-foreground">
                        No attendance records found.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
