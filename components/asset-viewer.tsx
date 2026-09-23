"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  authorId: string;
  author: { name: string };
};

type Pin = {
  id: string;
  x: number;
  y: number;
  authorId?: string;
  resolvedAt?: string | null;
  comments: Comment[];
};

export function AssetViewer({
  imageUrl,
  versionId,
  pins,
  canAnnotate,
  currentUserId,
  canModerate,
}: {
  imageUrl: string;
  versionId: string;
  pins: Pin[];
  canAnnotate: boolean;
  currentUserId: string;
  canModerate?: boolean;
}) {
  const [localPins, setLocalPins] = useState(pins);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(pins.find((pin) => !pin.resolvedAt)?.id ?? pins[0]?.id ?? null);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = selected === "draft" ? null : localPins.find((pin) => pin.id === selected);

  function placeDraft(event: React.MouseEvent<HTMLImageElement>) {
    if (!canAnnotate) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setDraft({ x, y });
    setSelected("draft");
    setBody("");
    setError(null);
  }

  async function saveDraft() {
    if (!draft || !body.trim()) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId, x: draft.x, y: draft.y, body }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save pin");
      return;
    }
    setLocalPins((current) => [...current, data.annotation]);
    setSelected(data.annotation.id);
    setDraft(null);
    setBody("");
  }

  async function addComment() {
    if (!active || !body.trim()) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotationId: active.id, body }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not comment");
      return;
    }
    setLocalPins((current) =>
      current.map((pin) =>
        pin.id === active.id ? { ...pin, comments: [...pin.comments, data.comment] } : pin,
      ),
    );
    setBody("");
  }

  async function removePin(id: string) {
    const res = await fetch(`/api/annotations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not remove pin");
      return;
    }
    setLocalPins((current) => current.filter((pin) => pin.id !== id));
    setSelected(null);
  }

  async function toggleResolved(id: string, resolved: boolean) {
    const res = await fetch(`/api/annotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update the thread");
      return;
    }
    setLocalPins((current) =>
      current.map((pin) =>
        pin.id === id ? { ...pin, resolvedAt: data.annotation.resolvedAt } : pin,
      ),
    );
  }

  async function saveEdit(commentId: string) {
    if (!editBody.trim()) return;
    setPending(true);
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not edit comment");
      return;
    }
    setLocalPins((current) =>
      current.map((pin) => ({
        ...pin,
        comments: pin.comments.map((comment) => (comment.id === commentId ? data.comment : comment)),
      })),
    );
    setEditingId(null);
  }

  async function removeComment(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not delete comment");
      return;
    }
    setLocalPins((current) =>
      current.map((pin) => ({
        ...pin,
        comments: pin.comments.filter((comment) => comment.id !== commentId),
      })),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative overflow-hidden rounded-2xl border border-rule bg-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          onClick={placeDraft}
          className={`block w-full ${canAnnotate ? "cursor-crosshair" : ""}`}
        />
        {localPins.map((pin, index) => (
          <button
            key={pin.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelected(pin.id);
              setDraft(null);
            }}
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
            className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-semibold ${
              pin.resolvedAt
                ? "bg-paper-2 text-muted line-through"
                : selected === pin.id
                  ? "bg-accent text-white"
                  : "bg-ink text-paper"
            }`}
          >
            {index + 1}
          </button>
        ))}
        {draft && (
          <span
            style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent"
          />
        )}
      </div>
      <aside className="rounded-2xl border border-rule bg-white/70 p-4">
        <p className="font-serif text-xl">Feedback</p>
        <p className="mt-1 text-sm text-muted">
          {canAnnotate
            ? "Click the image, write a note, then save. A click alone is not a comment."
            : "Pins stay on this version."}
        </p>
        <div className="mt-4 space-y-2">
          {localPins.map((pin, index) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => {
                setSelected(pin.id);
                setDraft(null);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                selected === pin.id ? "bg-ink text-paper" : "bg-paper-2"
              }`}
            >
              <span>
                Pin {index + 1}
                {pin.resolvedAt ? " · resolved" : ""}
              </span>
              <span className="text-xs opacity-70">{pin.comments.length}</span>
            </button>
          ))}
        </div>
        {selected === "draft" && draft && (
          <div className="mt-5 space-y-3">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What should change here?"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={saveDraft} disabled={pending || !body.trim()}>
                {pending ? "Saving…" : "Save pin"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(null);
                  setSelected(null);
                  setBody("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {active && (
          <div className="mt-5 space-y-3">
            {active.comments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-paper-2 p-3">
                <p className="text-xs font-semibold">{comment.author.name}</p>
                {editingId === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => saveEdit(comment.id)} disabled={pending}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm">{comment.body}</p>
                )}
                <p className="mt-1 text-[11px] text-muted">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  {comment.editedAt ? " · edited" : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {comment.authorId === currentUserId && canAnnotate && editingId !== comment.id && (
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditBody(comment.body);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {(comment.authorId === currentUserId || canModerate) && (
                    <button type="button" className="text-xs underline" onClick={() => removeComment(comment.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canAnnotate && (
              <>
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Reply on this pin"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={addComment} disabled={pending || !body.trim()}>
                    {pending ? "Saving…" : "Add comment"}
                  </Button>
                  {(active.authorId === currentUserId || canModerate) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleResolved(active.id, !active.resolvedAt)}
                    >
                      {active.resolvedAt ? "Reopen thread" : "Resolve thread"}
                    </Button>
                  )}
                  {(active.authorId === currentUserId || canModerate) && (
                    <Button type="button" variant="ghost" onClick={() => removePin(active.id)}>
                      Remove pin
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </aside>
    </div>
  );
}
