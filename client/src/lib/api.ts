import type { Content, Playlist } from "@db/schema";

export async function fetchContents(): Promise<Content[]> {
  const response = await fetch("/api/contents", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch contents");
  }

  return response.json();
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const response = await fetch("/api/playlists", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch playlists");
  }

  return response.json();
}

export async function fetchPlaylistContents(playlistId: number): Promise<Content[]> {
  const response = await fetch(`/api/playlists/${playlistId}/contents`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch playlist contents");
  }

  return response.json();
}
