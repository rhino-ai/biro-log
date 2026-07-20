import { useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
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
      toast.success(`Sent to ${r?.sent ?? 0} device(s)`);
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
                {subscribed ? "Enabled on this device" : "Reminders, mentor check-ins, streak alerts"}
              </div>
            </div>
          </div>
          <Button size="sm" variant={subscribed ? "outline" : "default"} onClick={handleToggle} disabled={busy}>
            {subscribed ? "Disable" : "Enable"}
          </Button>
        </div>
        {subscribed && (
          <Button size="sm" variant="ghost" className="w-full" onClick={handleTest} disabled={busy}>
            Send test notification
          </Button>
        )}
      </CardContent>
    </Card>
  );
}