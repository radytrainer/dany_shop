"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="outline" className="h-9 rounded-sm" onClick={() => window.print()}>
      <Printer className="size-4" /> Print
    </Button>
  );
}
