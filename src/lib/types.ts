export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type Couple = {
  id: string;
  name: string;
  anniversary: string | null;
  invite_code: string;
  created_at: string;
  theme?: string | null;
};

export type Meeting = {
  id: string;
  couple_id: string;
  title: string;
  place: string | null;
  note: string | null;
  starts_at: string;
  created_by: string;
};

export type CheckinSession = {
  id: string;
  couple_id: string;
  meeting_id: string | null;
  place: string | null;
  started_by: string;
  created_at: string;
  together_at: string | null;
  ended_at: string | null;
  mood: string | null;
  note: string | null;
};

export type Issue = {
  id: string;
  title: string;
  category: string;
  feeling: string | null;
  status: "waiting" | "discussing" | "resolved";
  agreement: string | null;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
};

export type IssueResponse = {
  issue_id: string;
  user_id: string;
  feeling: string;
  created_at: string;
};

export type Photo = {
  id: string;
  storage_path: string;
  thumb_path: string | null;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
  checkin_session_id: string | null;
};

export type Message = {
  id: string;
  couple_id: string;
  sender_id: string;
  kind: "text" | "heart" | "photo" | "sticker";
  body: string | null;
  media_path: string | null;
  thumb_path?: string | null;
  created_at: string;
  read_at: string | null;
};

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;
