import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { FileText, Sparkles, Upload, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type Suggested = {
  title: string;
  description: string;
  target_hours: number;
  target_date: string | null;
  subjects: string[];
};

interface Props {
  onClose: () => void;
  onCreated: (count: number) => void;
}

export function SyllabusImport({ onClose, onCreated }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<Suggested[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const onFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
  };

  const onParse = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!text.trim() && !file) {
      setError("Paste syllabus text or upload a PDF.");
      return;
    }
    setParsing(true);
    try {
      const res = await api.parseSyllabus({
        text: text.trim() || undefined,
        file: file || undefined,
      });
      setSuggested(res.goals);
      setSelected(new Set(res.goals.map((_, i) => i)));
      if (res.goals.length === 0) {
        setError("No goals extracted — try a different syllabus or a longer excerpt.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to parse syllabus");
    } finally {
      setParsing(false);
    }
  };

  const onCreateGoals = async () => {
    if (!suggested) return;
    setCreating(true);
    setError(null);
    try {
      const toCreate = suggested.filter((_, i) => selected.has(i));
      for (const goal of toCreate) {
        await api.createGoal({
          title: goal.title,
          description: goal.description || undefined,
          target_hours: goal.target_hours,
          target_date: goal.target_date,
          subjects: goal.subjects,
        });
      }
      onCreated(toCreate.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create goals");
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  const updateField = (i: number, field: keyof Suggested, value: any) => {
    if (!suggested) return;
    const copy = [...suggested];
    copy[i] = { ...copy[i], [field]: value };
    setSuggested(copy);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ccff00]" />
            Import from syllabus
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!suggested ? (
          <form onSubmit={onParse} className="flex-1 overflow-y-auto p-8 space-y-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light">
              Paste your syllabus or upload the PDF. An AI assistant will suggest study goals
              with estimated hours and deadlines. You'll review before anything is saved.
            </p>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Syllabus text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste course description, weekly topics, deadlines, exam dates…"
                className="w-full bg-transparent border border-zinc-300 dark:border-white/20 p-4 rounded-xl text-sm font-light focus:outline-none focus:border-[#ccff00] resize-y"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                …or upload a PDF
              </label>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-light text-zinc-600 dark:text-zinc-400 flex-1">
                  {file ? file.name : "Select PDF (max 10MB)"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={onFilePick}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <div className="text-xs text-red-400 font-medium" role="alert">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-full text-xs font-bold tracking-widest uppercase border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 text-zinc-900 dark:text-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={parsing}
                className="flex-1 py-4 rounded-full text-xs font-bold tracking-widest uppercase bg-[#ccff00] text-black hover:bg-[#b3e600] transition-colors disabled:opacity-50"
              >
                {parsing ? "Analyzing…" : "Suggest goals"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light">
              Review the suggested goals. Uncheck to skip, edit any field, then create.
            </p>

            {suggested.map((g, i) => (
              <div
                key={i}
                className={`p-5 rounded-xl border space-y-3 transition-colors ${
                  selected.has(i)
                    ? "border-[#ccff00]/30 bg-[#ccff00]/[0.03]"
                    : "border-zinc-200 dark:border-white/10 opacity-60"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    className="mt-1 accent-[#ccff00]"
                  />
                  <input
                    value={g.title}
                    onChange={(e) => updateField(i, "title", e.target.value)}
                    className="flex-1 bg-transparent border-b border-zinc-200 dark:border-white/10 py-1 text-base font-medium focus:outline-none focus:border-[#ccff00]"
                  />
                </label>
                {g.description && (
                  <textarea
                    value={g.description}
                    onChange={(e) => updateField(i, "description", e.target.value)}
                    rows={2}
                    className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-lg p-3 text-sm font-light focus:outline-none focus:border-[#ccff00] resize-none"
                  />
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Hours
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={g.target_hours}
                      onChange={(e) =>
                        updateField(i, "target_hours", Number(e.target.value))
                      }
                      className="w-20 bg-transparent border-b border-zinc-200 dark:border-white/10 py-1 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-[#ccff00]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Target date
                    <input
                      type="date"
                      value={g.target_date ?? ""}
                      onChange={(e) =>
                        updateField(i, "target_date", e.target.value || null)
                      }
                      className="bg-transparent border-b border-zinc-200 dark:border-white/10 py-1 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-[#ccff00]"
                    />
                  </label>
                  {g.subjects.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {g.subjects.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                        >
                          <FileText className="w-3 h-3 inline mr-1" />
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-xs text-red-400 font-medium" role="alert">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-[#0a0a0a] pb-2">
              <button
                type="button"
                onClick={() => setSuggested(null)}
                className="flex-1 py-4 rounded-full text-xs font-bold tracking-widest uppercase border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 text-zinc-900 dark:text-zinc-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={creating || selected.size === 0}
                onClick={onCreateGoals}
                className="flex-1 py-4 rounded-full text-xs font-bold tracking-widest uppercase bg-[#ccff00] text-black hover:bg-[#b3e600] transition-colors disabled:opacity-50"
              >
                {creating
                  ? "Creating…"
                  : `Create ${selected.size} goal${selected.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
