import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect root access (http://localhost:3000/) directly to login
  redirect('/login');
}
