"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" className="print:hidden mt-8" onClick={() => window.print()}>
      Print / save PDF
    </Button>
  );
}
