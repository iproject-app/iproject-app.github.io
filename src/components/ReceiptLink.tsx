interface Props {
  filename: string;
}

export function ReceiptLink({ filename }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M3 2h7l3 3v9H3V2z" strokeLinejoin="round" />
        <path d="M10 2v3h3" strokeLinejoin="round" />
      </svg>
      <span className="truncate" title={filename}>
        receipt
      </span>
    </span>
  );
}
