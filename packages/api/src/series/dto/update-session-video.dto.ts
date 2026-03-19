export class UpdateSessionVideoDto {
  title?: string;
  videoType?: 'main_recording' | 'meditation' | 'bonus' | 'tutorial' | 'supplementary';
  bunnyUrl?: string;
  description?: string;
  facilitator?: string;
  durationMinutes?: number;
  displayOrder?: number;
  isPublished?: boolean;
}
