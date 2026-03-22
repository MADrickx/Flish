import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  afterNextRender,
  OnDestroy,
  effect,
} from '@angular/core';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';
import Artplayer from 'artplayer';

@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StreamLinkComponent],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css',
})
export class VideoPlayerComponent implements OnDestroy {
  src = input.required<string>();
  title = input<string>('');
  shortCode = input<string>('');
  closed = output<void>();

  private readonly playerContainer = viewChild.required<ElementRef<HTMLDivElement>>('playerContainer');
  private artPlayer: Artplayer | null = null;

  constructor() {
    afterNextRender(() => {
      this.initPlayer();
    });

    effect(() => {
      const url = this.src();
      if (this.artPlayer && url) {
        this.artPlayer.switchUrl(url);
      }
    });
  }

  ngOnDestroy(): void {
    this.artPlayer?.destroy();
    this.artPlayer = null;
  }

  private initPlayer(): void {
    const container = this.playerContainer().nativeElement;

    this.artPlayer = new Artplayer({
      container,
      url: this.src(),
      autoplay: true,
      fullscreen: true,
      pip: true,
      playbackRate: true,
      setting: true,
      hotkey: true,
      volume: 0.7,
      theme: '#4f8cff',
      moreVideoAttr: {
        preload: 'metadata',
      },
    });
  }

  protected onClose(): void {
    this.artPlayer?.pause();
    this.closed.emit();
  }
}
