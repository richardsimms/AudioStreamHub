import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPlaylistContents } from "@/lib/api";
import type { Content, Playlist as PlaylistType } from "@db/schema";

interface PlaylistProps {
  playlist: PlaylistType;
  onPlayContent: (content: Content) => void;
}

export function Playlist({ playlist, onPlayContent }: PlaylistProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: contents = [] } = useQuery({
    queryKey: ["/api/playlists", playlist.id, "contents"],
    queryFn: () => fetchPlaylistContents(playlist.id),
  });

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            {playlist.name}
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-2">
              {contents.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm">{content.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPlayContent(content)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
