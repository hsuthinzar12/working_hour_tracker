import './globals.css'

export const metadata = {
  title: 'Working Hour Tracker',
  description: 'Mobile-first construction worker timesheet and admin dashboard'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
