"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { Field, ImageUploader, inputClass } from "../AdminFormControls";

export type FormState = {
  name: string;
  duration: string;
  pickupTime: string;
  startingPrice: string;
  description: string;
  highlights: string;
  included: string;
  image: string;
};

type Props = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  editingSlug: string | null;
  saving: boolean;
  error: string;
  uploadSlug: string;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};

export default function TourEditor({
  form,
  setForm,
  editingSlug,
  saving,
  error,
  uploadSlug,
  onSubmit,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl2 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">
            {editingSlug ? "Edit Tour" : "Add Tour"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-700 hover:bg-sand-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Tour Name" required>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sigiriya Day Tour"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration">
              <input
                className={inputClass}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="Full Day (10-12 hrs)"
              />
            </Field>
            <Field label="Pickup Time">
              <input
                className={inputClass}
                value={form.pickupTime}
                onChange={(e) =>
                  setForm({ ...form, pickupTime: e.target.value })
                }
                placeholder="6:00 AM"
              />
            </Field>
          </div>

          <Field
            label="Starting Price"
            hint="Shown on the tour card, e.g. $65 or LKR 20,000."
          >
            <input
              className={inputClass}
              value={form.startingPrice}
              onChange={(e) =>
                setForm({ ...form, startingPrice: e.target.value })
              }
              placeholder="$65"
            />
          </Field>

          <Field label="Description">
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

          <Field label="Highlights" hint="One highlight per line.">
            <textarea
              className={inputClass}
              rows={4}
              value={form.highlights}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              placeholder={
                "Climb Sigiriya Rock Fortress\nAncient frescoes and Mirror Wall"
              }
            />
          </Field>

          <Field label="What's Included" hint="One item per line.">
            <textarea
              className={inputClass}
              rows={3}
              value={form.included}
              onChange={(e) => setForm({ ...form, included: e.target.value })}
              placeholder={
                "Private air-conditioned transport\nExperienced driver"
              }
            />
          </Field>

          <Field label="Photo">
            <ImageUploader
              value={form.image}
              onChange={(path) => setForm({ ...form, image: path })}
              target="tours"
              slug={uploadSlug}
              fallbackLabel={form.name}
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ocean-700 disabled:opacity-60"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {editingSlug ? "Save Changes" : "Add Tour"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
