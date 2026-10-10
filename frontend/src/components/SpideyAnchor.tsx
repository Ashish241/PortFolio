import type { ReactNode } from "react";
import type { Pose } from "../companion/engine";
export function SpideyAnchor({
  id,
  elementType,
  poses,
  priority = 2,
  mobileEnabled = true,
  children,
}: {
  id: string;
  elementType: string;
  poses: Pose[];
  priority?: number;
  mobileEnabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="spidey-anchor-wrapper"
      data-spidey-source={elementType}
      data-spidey-id={id}
      data-spidey-poses={poses.join(",")}
      data-spidey-priority={priority}
      data-spidey-mobile={String(mobileEnabled)}
    >
      {children}
    </div>
  );
}
