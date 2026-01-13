"use client";

import classNames from "@calcom/ui/classNames";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";

export function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
  side = "top",
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  onOpenChange?: (open: boolean) => void;
} & TooltipPrimitive.TooltipContentProps): React.JSX.Element {
  const Content = (
    <TooltipPrimitive.Content
      {...props}
      className={classNames(
        "calcom-tooltip",
        side === "top" && "-mt-7",
        side === "left" && "mr-2",
        side === "right" && "ml-2",
        "bg-inverted text-inverted relative z-50 rounded-sm px-2 py-1 text-xs font-semibold shadow-lg",
        props.className && `${props.className}`
      )}
      side={side}
      align="center">
      {content}
    </TooltipPrimitive.Content>
  );

  // Ensure children is a single React element for React 19 compatibility
  // Radix UI's asChild prop uses cloneElement internally, which accesses element.ref
  // In React 19, ref is now a regular prop, so we need to ensure proper ref forwarding
  let childElement: React.ReactElement;
  if (React.isValidElement(children)) {
    childElement = children;
  } else {
    childElement = <span>{children}</span>;
  }

  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration || 50}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{childElement}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>{Content}</TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
