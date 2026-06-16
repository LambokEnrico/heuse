// Navigation utility - simple wrapper around Next.js Link
import NextLink from "next/link";
import { ReactNode, ComponentProps } from "react";

type NextLinkProps = ComponentProps<typeof NextLink>;

export { NextLink as Link };

export function NavigationLink({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string } & NextLinkProps) {
  return (
    <NextLink href={href} className={className} {...props}>
      {children}
    </NextLink>
  );
}