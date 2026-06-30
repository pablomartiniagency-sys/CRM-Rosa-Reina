import Link from "next/link";

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 group">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-sm font-black text-rose-700 ring-1 ring-rose-200">
        RR
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-ink-900 tracking-tight">Rosa Reina</span>
        <span className="text-[10px] text-ink-400 font-medium">CRM interno</span>
      </span>
    </Link>
  );
}
