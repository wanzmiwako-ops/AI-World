/** Data Story & Sorotan (dipakai di server dan di HP). */
export type StoryView = { user_id: string; reaction: string | null; viewed_at: string };

export type Story = {
  id: string;
  author_id: string;
  media_path: string;
  thumb_path: string | null;
  highlight_id: string | null;
  created_at: string;
  expires_at: string;
  views: StoryView[];
  url?: string;
  thumbUrl?: string;
};

export type Highlight = {
  id: string;
  title: string;
  emoji: string | null;
  created_by: string;
  created_at: string;
  stories: Story[];
};

export type StoryFeed = { stories: Story[]; highlights: Highlight[] };

export const EMPTY_FEED: StoryFeed = { stories: [], highlights: [] };

export const STORY_REACTIONS = ["😍", "😂", "🥺", "🔥", "💗", "😻"];

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam`;
  return `${Math.floor(h / 24)} hari`;
}
