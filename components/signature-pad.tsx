"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<import("fabric").Canvas | null>(null);

  useEffect(() => {
    let disposed = false;
    async function setup() {
      const fabric = await import("fabric");
      const el = canvasRef.current;
      if (!el || disposed) return;
      const canvas = new fabric.Canvas(el, {
        width: 420,
        height: 140,
        isDrawingMode: true,
        backgroundColor: "#fffaf3",
      });
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = "#1c1915";
      canvas.freeDrawingBrush.width = 2;
      canvas.on("path:created", () => {
        onChange(canvas.toDataURL({ format: "png", multiplier: 2 }));
      });
      fabricRef.current = canvas;
    }
    setup();
    return () => {
      disposed = true;
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, [onChange]);

  function clear() {
    fabricRef.current?.clear();
    fabricRef.current?.set("backgroundColor", "#fffaf3");
    fabricRef.current?.requestRenderAll();
    onChange(null);
  }

  return (
    <div>
      <canvas ref={canvasRef} className="rounded-xl border border-rule" />
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={clear}>
        Clear signature
      </Button>
    </div>
  );
}
