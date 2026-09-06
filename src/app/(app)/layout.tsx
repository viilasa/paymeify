import { Sidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/topbar";
import { displayName, requireSession } from "@/lib/auth";
import { countPendingPaymentReports } from "@/lib/data/projects";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, pendingPayments] = await Promise.all([
    requireSession(),
    countPendingPaymentReports(),
  ]);
  const name = displayName(profile);

  return (
    <div className="min-h-dvh">
      <Sidebar name={name} email={profile.email} pendingPayments={pendingPayments} />
      <TopBar name={name} email={profile.email} pendingPayments={pendingPayments} />
      <div className="md:pl-52">
        <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
