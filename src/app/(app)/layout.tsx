import { Sidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/topbar";
import { displayName, requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();
  const name = displayName(profile);

  return (
    <div className="min-h-dvh">
      <Sidebar name={name} email={profile.email} />
      <TopBar name={name} email={profile.email} />
      <div className="md:pl-52">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
