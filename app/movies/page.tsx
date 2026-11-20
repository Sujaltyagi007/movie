import type { Metadata } from "next";
import { BrowseView } from "@/components/browse-view";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse popular, top rated, in-theater and upcoming movies by genre and streaming platform.",
};

export default function MoviesPage({ searchParams }: PageProps<"/movies">) {
  return <BrowseView type="movie" searchParams={searchParams} />;
}
