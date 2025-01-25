import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteContent } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Content } from "@db/schema";

interface ContentCardProps {
  content: Content;
  onPlay: () => void;
}

export function ContentCard({ content, onPlay }: ContentCardProps) {
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
              if (window.confirm('Are you sure you want to delete this content?')) {
                await deleteContent(content.id);
                queryClient.invalidateQueries(["/api/contents"]);
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
              <div dangerouslySetInnerHTML={{ 
                __html: (content.summary as any).intro 
              }} />
              <ul className="list-disc list-inside mt-2">
                {(content.summary as any).key_points.map((point: string, i: number) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
              <div className="mt-2" dangerouslySetInnerHTML={{ 
                __html: (content.summary as any).ending 
              }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
