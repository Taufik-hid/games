import { clsx } from "@/lib/utils";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({ variant = "primary", className, ...rest }: BtnProps) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-base font-semibold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-pink-400 text-white hover:bg-pink-500",
    secondary: "bg-white text-pink-600 border border-pink-200 hover:bg-pink-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-pink-600 hover:bg-pink-50",
  };
  return <button className={clsx(base, variants[variant], className)} {...rest} />;
}

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={"scrapbook-card p-5 " + (className ?? "")} {...rest} />;
}

export function Loader({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-400" />
      <span className="text-sm text-pink-500">{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-lg font-semibold text-pink-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-pink-400">{hint}</p>}
    </div>
  );
}

export function ConnectionBanner({ state }: { state: "online" | "reconnecting" | "offline" }) {
  if (state === "online") return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950"
      role="alert"
    >
      {state === "reconnecting" ? "Menyambung kembali…" : "Koneksi terputus — cek internetmu"}
    </div>
  );
}

export function Toast({ message, tone = "info" }: { message: string; tone?: "info" | "error" | "success" }) {
  const tones = { info: "bg-pink-100 text-pink-700", error: "bg-red-100 text-red-700", success: "bg-green-100 text-green-700" };
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${tones[tone]}`} role="status">
      {message}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="scrapbook-card max-h-[85dvh] w-full max-w-md overflow-auto p-6"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-xl font-bold text-pink-600">{title}</h2>
        {children}
      </div>
    </div>
  );
}
