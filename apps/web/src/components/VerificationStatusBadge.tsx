const statusConfig: Record<
  string,
  { className: string; label: string }
> = {
  verified: { className: "badge-success", label: "Verified" },
  pending: { className: "badge-warning", label: "Pending" },
  failed: { className: "badge-error", label: "Failed" },
};

interface VerificationStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

export function VerificationStatusBadge({
  status,
  size = "default",
}: VerificationStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    className: "badge-warning",
    label: status || "Pending",
  };
  return (
    <span
      className={`badge ${config.className} ${size === "sm" ? "text-xs" : ""}`}
      title={status === "failed" ? "Verification failed" : undefined}
    >
      {config.label}
    </span>
  );
}
