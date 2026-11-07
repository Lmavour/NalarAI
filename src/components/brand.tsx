import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  compact?: boolean;
  href?: string;
  inverse?: boolean;
};

export function Brand({ compact = false, href = "/", inverse = false }: BrandProps) {
  const destination = href === "/app" ? "aplikasi belajar" : "halaman utama";

  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center gap-2.5 rounded-xl"
      aria-label={`NalarAI, ${destination}`}
    >
      <span className={`relative ${compact ? "size-9 rounded-xl" : "size-10 rounded-[14px]"} shrink-0 overflow-hidden bg-white shadow-[0_4px_0_#0f52cc]`} aria-hidden="true">
        <Image
          src="/logo-mark.png"
          alt=""
          width={compact ? 36 : 40}
          height={compact ? 36 : 40}
          sizes={compact ? "36px" : "40px"}
          className="size-full object-cover"
        />
      </span>
      <span className={`${compact ? "text-xl" : "text-[22px]"} font-[950] tracking-[-0.04em] ${inverse ? "text-white" : "text-ink"}`}>
        Nalar<span className={inverse ? "text-blue-100" : "text-cobalt"}>AI</span>
      </span>
    </Link>
  );
}
