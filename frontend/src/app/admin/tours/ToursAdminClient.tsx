"use client";

import { useEffect, useState } from "react";
import { revalidateAfterTourChange } from "./actions";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Tour } from "@/types/tour";
import { slugify } from "@/lib/slug";
import dynamic from "next/dynamic";
import { tourThumbnailLoader } from "@/lib/tour-thumbnail-loader";
import type { FormState } from "./TourEditor";

const TourEditor = dynamic(() => import("./TourEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      role="status"
    >
      <div className="rounded-xl2 bg-white p-6 shadow-card">
        Loading tour editor…
      </div>
    </div>
  ),
});

const emptyForm: FormState = {
  name: "",
  duration: "",
  pickupTime: "",
  startingPrice: "",
  description: "",
  highlights: "",
  included: "",
  image: "",
};

function tourToForm(tour: Tour): FormState {
  return {
    name: tour.name,
    duration: tour.duration,
    pickupTime: tour.pickupTime,
    startingPrice: tour.startingPrice,
    description: tour.description,
    highlights: tour.highlights.join("\n"),
    included: tour.included.join("\n"),
    image: tour.image,
  };
}

export default function ToursAdminClient({
  initialTours,
}: {
  initialTours: Tour[];
}) {
  const router = useRouter();
  const [thumbnailFailures, setThumbnailFailures] = useState<
    Record<string, boolean>
  >({});
  const [tours, setTours] = useState<Tour[]>(initialTours);
  useEffect(() => {
    setTours(initialTours);
  }, [initialTours]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");

  async function refreshAfterWrite() {
    try {
      await revalidateAfterTourChange();

      setSyncNotice("");
    } catch {
      setSyncNotice(
        "The change was saved, but the page cache could not be refreshed.",
      );
    }

    router.refresh();
  }
  function openAdd() {
    setForm(emptyForm);
    setEditingSlug(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(tour: Tour) {
    setForm(tourToForm(tour));
    setEditingSlug(tour.slug);
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Tour name is required.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      duration: form.duration.trim(),
      pickupTime: form.pickupTime.trim(),
      startingPrice: form.startingPrice.trim(),
      description: form.description.trim(),
      highlights: form.highlights,
      included: form.included,
      image: form.image,
    };

    try {
      const url = editingSlug
        ? `/api/admin/tours/${editingSlug}`
        : "/api/admin/tours";
      const method = editingSlug ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSaving(false);
        return;
      }

      const saved: Tour = data.tour;
      setTours((prev) => {
        if (editingSlug) {
          return prev.map((t) => (t.slug === editingSlug ? saved : t));
        }
        return [...prev, saved];
      });

      setShowForm(false);
      setSaving(false);

      await refreshAfterWrite();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setSyncNotice("");

    try {
      const res = await fetch(`/api/admin/tours/${deleteTarget.slug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setSyncNotice("Failed to delete tour. Please try again.");
        return;
      }

      setTours((prev) => prev.filter((t) => t.slug !== deleteTarget.slug));

      setDeleteTarget(null);

      await refreshAfterWrite();
    } catch {
      setSyncNotice("Something went wrong while deleting the tour.");
    } finally {
      setDeleting(false);
    }
  }
  const uploadSlug = editingSlug || slugify(form.name || "tour");

  return (
    <div>
      {syncNotice && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800"
        >
          {syncNotice}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Tours
          </h1>
          <p className="mt-1 text-sm text-ink-700">
            Edit tour details, starting prices, and photos shown on the public
            site.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-full bg-palm-600 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Tour
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour, index) => (
          <div
            key={tour.slug}
            className="overflow-hidden rounded-xl2 bg-white shadow-soft"
          >
            <div className="relative h-36 bg-sand-100">
              {tour.image && (
                <Image
                  src={tour.image}
                  alt={tour.name}
                  fill
                  sizes="(min-width: 1280px) 400px, (min-width: 1024px) calc(33.333vw - 27px), (min-width: 640px) calc(50vw - 30px), calc(100vw - 40px)"
                  loader={
                    thumbnailFailures[tour.image]
                      ? undefined
                      : tourThumbnailLoader
                  }
                  onError={() =>
                    setThumbnailFailures((previous) =>
                      previous[tour.image]
                        ? previous
                        : { ...previous, [tour.image]: true },
                    )
                  }
                  quality={60}
                  preload={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  fetchPriority={index === 0 ? undefined : "low"}
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-ink-900">
                  {tour.name}
                </h2>
                {tour.startingPrice && (
                  <span className="whitespace-nowrap rounded-full bg-gold-400/20 px-2.5 py-1 text-xs font-bold text-ink-900">
                    {tour.startingPrice}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-700/80">{tour.duration}</p>
              <p className="mt-2 line-clamp-2 text-xs text-ink-700">
                {tour.description}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEdit(tour)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-900/15 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-sand-100"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(tour)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {tours.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-ink-700/60">
            No tours yet. Add your first one.
          </p>
        )}
      </div>

      {showForm && (
        <TourEditor
          form={form}
          setForm={setForm}
          editingSlug={editingSlug}
          saving={saving}
          error={error}
          uploadSlug={uploadSlug}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-card">
            <h2 className="font-display text-lg font-bold text-ink-900">
              Delete tour?
            </h2>
            <p className="mt-2 text-sm text-ink-700">
              “{deleteTarget.name}” will be permanently removed from the site.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-sand-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
