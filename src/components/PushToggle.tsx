import { useState } from "react";
import { Bell, BellOff, BellRing, ShieldCheck, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushToggle() {
  const { status, subscribed, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const [busy, setBusy] = useState(false);

  if (status === "unsupported") {
    return (
      <Card className="border-border/40">
        <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
          <BellOff className="w-4 h-4" /> Push notifications aren't supported on this device.
        </CardContent>
      </Card>
    );
  }

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribe();
        toast("Notifications off");
      } else {
        await subscribe();
        toast.success("Notifications on 🔔");
      }
    } catch (e: any) {
      toast.error(e?.message || "Couldn't update notifications");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const r: any = await sendTest();
      const sent = r?.sent ?? 0;
      if (sent > 0) toast.success(`Test sent to ${sent} device(s)`);
      else toast.error("No subscribed device found — tap Enable first on this phone/browser.");
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {subscribed ? <BellRing className="w-5 h-5 text-primary" /> : <Bell className="w-5 h-5" />}
            <div>
              <div className="font-semibold text-sm">Push Notifications</div>
              <div className="text-xs text-muted-foreground">
                {subscribed ? "Enabled on this device" : status === "denied" ? "Blocked in browser settings" : "Tasks, chat, mentor check-ins"}
              </div>
            </div>
          </div>
          <Button size="sm" variant={subscribed ? "outline" : "default"} onClick={handleToggle} disabled={busy}>
            {subscribed ? "Disable" : "Enable"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="rounded-md border border-border/50 px-2 py-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Permission: {status}</div>
          <div className="rounded-md border border-border/50 px-2 py-1 flex items-center gap-1"><BellRing className="w-3 h-3" /> Device: {subscribed ? 'saved' : 'not saved'}</div>
        </div>
        <Button size="sm" variant={subscribed ? "secondary" : "outline"} className="w-full" onClick={handleTest} disabled={busy || !subscribed}>
          <TestTube2 className="w-3 h-3 mr-1" /> Send test notification
        </Button>
      </CardContent>
    </Card>
  );
}