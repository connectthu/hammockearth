export class CreateContentDto {
  title!: string;
  slug!: string;
  summary?: string;
  body?: string;
  cover_image_url?: string;
  content_type!: string;
  media_url?: string;
  media_kind?: string;
  topics?: string[];
  visible_to?: string[];
  is_featured?: boolean;
  read_time_minutes?: number;
  watch_listen_minutes?: number;
  published_at?: string | null;
}
