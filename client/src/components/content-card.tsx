import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteContent } from "@/lib/api";
import type { Content } from "@db/schema";

interface ContentCardProps {
  content: Content;
  onPlay: () => void;
}

export function ContentCard({ content, onPlay }: ContentCardProps) {
  const queryClient = useQueryClient();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{content.title}</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" onClick={onPlay}>
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={async () => {
              if (
                window.confirm("Are you sure you want to delete this content?")
              ) {
                await deleteContent(content.id);
                queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {content.summary && (
            <div className="text-sm text-muted-foreground">
              <div
                dangerouslySetInnerHTML={{
                  __html: content.summary.intro, // Ensure intro is a string
                }}
              />
              <ul className="list-disc list-inside mt-2">
                {content.summary.key_points.map(
                  (point: string, i: number) => (
                    <li key={i}>{point}</li>
                  ),
                )}
              </ul>
              <div
                className="mt-2"
                dangerouslySetInnerHTML={{
                  __html: content.summary.ending, // Ensure ending is a string
                }}
              />
              {content.summary.tags && (
                <div className="mt-2 flex gap-2">
                  {(content.summary.tags as string[]).map(
                    (tag: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-secondary rounded-full"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
