'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface Session {
  id: string;
  name: string;
  created_at: string;
  ended_at: string | null;
  expiration_minutes: number;
}

interface Attendance {
  user_name: string;
  user_email: string;
  timestamp: string;
}

export default function SessionDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [attendees, setAttendees] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      router.push('/');
      return;
    }

    const fetchSessionData = async () => {
      try {
        const [sessionRes, attendeesRes] = await Promise.all([
          fetch(`/api/sessions/${id}`),
          fetch(`/api/attendance?sessionId=${id}`)
        ]);

        if (!sessionRes.ok || !attendeesRes.ok) {
          throw new Error('Failed to fetch session data');
        }

        const [sessionData, attendeesData] = await Promise.all([
          sessionRes.json(),
          attendeesRes.json()
        ]);

        setSessionData(sessionData);
        setAttendees(attendeesData.attendees);
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [id, session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Session not found</h1>
          <Button
            onClick={() => router.push('/admin')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
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
              <BreadcrumbPage>Session Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="CS 162 Logo"
              width={40}
              height={40}
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{sessionData.name}</h1>
              <p className="text-sm text-muted-foreground">
                {new Date(sessionData.created_at).toLocaleDateString()} {new Date(sessionData.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/admin')}
          >
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Attendance Record</CardTitle>
              <span className="text-sm text-muted-foreground">
                Total Attendees: {attendees.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee, i) => (
                  <TableRow 
                    key={i}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/students/${encodeURIComponent(attendee.user_email)}`)}
                  >
                    <TableCell className="font-medium">{attendee.user_name}</TableCell>
                    <TableCell>{attendee.user_email}</TableCell>
                    <TableCell>{new Date(attendee.timestamp).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))}
                {attendees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No attendees recorded for this session.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 