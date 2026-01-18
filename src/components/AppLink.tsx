"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink>;

export default function AppLink(props: Props) {
  const { prefetch, ...rest } = props;
  const disablePrefetch = process.env.NEXT_PUBLIC_E2E === "1";
  return <NextLink {...rest} prefetch={disablePrefetch ? false : prefetch} />;
}

