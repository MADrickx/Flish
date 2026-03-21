import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-photo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './photo-card.component.css',
  templateUrl: './photo-card.component.html',
})
export class PhotoCardComponent {
  thumbUrl = input.required<string>();
  fileName = input.required<string>();
  selected = output<void>();
}
