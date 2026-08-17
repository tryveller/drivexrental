import logo from "@/assets/drivex-logo.png";
import { cn } from "@/lib/utils";

export function DriveXLogo({
  className,
  size = 40,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <img
      src={logo}
      alt="DriveX Rental logo"
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
