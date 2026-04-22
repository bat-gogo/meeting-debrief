import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function Nav({ userEmail }: { userEmail: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="font-semibold tracking-tight">Meeting Debrief</div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden max-w-[12rem] truncate text-sm sm:inline">
            {userEmail}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
