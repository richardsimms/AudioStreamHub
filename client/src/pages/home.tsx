import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayer } from "@/components/audio-player";
import { ContentCard } from "@/components/content-card";
import { Playlist } from "@/components/playlist";
import { fetchContents, fetchPlaylists } from "@/lib/api";
import type { Content, Playlist as PlaylistType } from "@db/schema";

export default function Home() {
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  
  const { data: contents = [] } = useQuery({
    queryKey: ["/api/contents"],
    queryFn: fetchContents,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    queryFn: fetchPlaylists,
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main content area */}
          <div className="md:col-span-8">
            <Tabs defaultValue="library">
              <TabsList>
                <TabsTrigger value="library">Library</TabsTrigger>
                <TabsTrigger value="playlists">Playlists</TabsTrigger>
              </TabsList>
              
              <TabsContent value="library">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="grid grid-cols-1 gap-4">
                    {contents.map((content) => (
                      <ContentCard
                        key={content.id}
                        content={content}
                        onPlay={() => setActiveContent(content)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="playlists">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="grid grid-cols-1 gap-4">
                    {playlists.map((playlist) => (
                      <Playlist
                        key={playlist.id}
                        playlist={playlist}
                        onPlayContent={setActiveContent}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Player and controls */}
          <div className="md:col-span-4">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                {activeContent ? (
                  <AudioPlayer content={activeContent} />
                ) : (
                  <div className="text-center text-muted-foreground">
                    Select content to play
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
