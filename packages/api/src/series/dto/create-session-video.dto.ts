export class CreateSessionVideoDto {
  title!: string;
  videoType!: 'main_recording' | 'meditation' | 'bonus' | 'tutorial' | 'supplementary';
  bunnyUrl?: string;
  bunnyVideoId?: string;
  description?: string;
  facilitator?: string;
  durationMinutes?: number;
  displayOrder?: number;
}
