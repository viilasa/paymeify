import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <EmptyState
      title="Not found"
      description="This project does not exist, or it is not yours to view."
      action={
        <Button asChild variant="secondary">
          <Link href="/projects">Back to projects</Link>
        </Button>
      }
    />
  );
}
