"use client";

import dynamic from "next/dynamic";

// The chat isn't needed for the first view, so its code loads after the page.
const ChatWidget = dynamic(() => import("./ChatWidget").then((m) => m.ChatWidget), { ssr: false });

export function ChatLoader() {
  return <ChatWidget />;
}
