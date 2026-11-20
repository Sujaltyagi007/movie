import type { Metadata } from "next";
import { BrowseView } from "@/components/browse-view";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Browse popular, top rated and currently airing series by genre and streaming platform.",
};

export default function TvPage({ searchParams }: PageProps<"/tv">) {
  return <BrowseView type="tv" searchParams={searchParams} />;
}
