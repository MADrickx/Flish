import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';

@Component({
  selector: 'app-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StreamLinkComponent],
  templateUrl: './video-card.component.html',
  styleUrl: './video-card.component.css',
})
export class VideoCardComponent {
  fileName = input.required<string>();
  extension = input.required<string>();
  size = input.required<string>();
  shortCode = input.required<string>();
  selected = output<void>();
}
