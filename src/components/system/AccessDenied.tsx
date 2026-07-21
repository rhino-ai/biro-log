import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Reusable access-denied screen shown when RLS / ban / role checks refuse
// the current user. Use inline inside a page to replace protected content.
export function AccessDenied({
  title = "Access denied",
  message = "You don't have permission to view this. If you think this is a mistake, contact the room host or an admin.",
  showBack = true,
}: {
  title?: string;
  message?: string;
  showBack?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
          <ShieldOff className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        {showBack && (
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Go back
          </Button>
        )}
      </div>
    </div>
  );
}