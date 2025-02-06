# CS 162 Attendance Tracker

A modern, QR code-based attendance tracking system built for CS 162 at UC Berkeley. This application allows instructors to easily track student attendance using QR codes and 6-digit codes, while students can quickly mark their attendance through their mobile devices.

## Features

- **QR Code Generation**: Automatically generates QR codes for each session
- **6-Digit Code Fallback**: Alternative manual code entry for attendance marking
- **Real-time Tracking**: Instant attendance validation and tracking
- **Admin Dashboard**: Comprehensive view of attendance statistics and session management
- **Dark Mode Support**: Full dark mode support for better visibility
- **Mobile Responsive**: Works seamlessly on all devices
- **Google Authentication**: Secure login with Berkeley GMail addresses

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- MySQL
- NextAuth.js
- Tailwind CSS
- shadcn/ui
- Bun

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/shamith09/cs162-attendance.git
cd cs162-attendance
```

2. Install dependencies:
```bash
bun install
```

3. Set up your environment variables:
```bash
cp .env.example .env.local
```
Fill in the required environment variables:
- `MYSQL_PUBLIC_URL`: Your MySQL connection string
- `NEXTAUTH_SECRET`: Your NextAuth secret
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

4. Set up the database:
```bash
# Create the database
mysql -u root -e "CREATE DATABASE attendance_tracker"

# Run the schema
mysql -u root attendance_tracker < schema.sql

# (Optional) Set up test users
bun run setup-test-users
```

5. Run the development server:
```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to start using the app.

## Development

- `bun dev`: Start development server
- `bun run build`: Build for production
- `bun start`: Start production server
- `bun run lint`: Run ESLint
- `bun run format`: Format code with Prettier

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
