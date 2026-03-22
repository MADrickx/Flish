import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AudioStore } from './audio.store';
import { MediaItem } from '../../../core/models/media.models';

describe('AudioStore', () => {
  let store: InstanceType<typeof AudioStore>;

  const mockTrack: MediaItem = {
    id: 'track-1',
    relativePath: 'music/song.mp3',
    fileName: 'song.mp3',
    extension: 'mp3',
    sizeBytes: 5000,
    mimeType: 'audio/mpeg',
    category: 'audio',
    shortCode: 'AUD123',
    lastWriteUtc: '',
    indexedAtUtc: '',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AudioStore);
  });

  it('should start idle with empty queue', () => {
    expect(store.playbackStatus()).toBe('idle');
    expect(store.nowPlaying()).toBeNull();
    expect(store.queue()).toEqual([]);
    expect(store.streamUrl()).toBeNull();
  });

  it('should compute streamUrl when playing', () => {
    store.play(mockTrack);
    expect(store.streamUrl()).toBe('/p/AUD123');
    expect(store.playbackStatus()).toBe('playing');
  });

  it('should manage queue', () => {
    const track2: MediaItem = { ...mockTrack, id: 'track-2', fileName: 'song2.mp3' };

    store.addToQueue(mockTrack);
    store.addToQueue(track2);
    expect(store.queueLength()).toBe(2);

    store.clearQueue();
    expect(store.queue()).toEqual([]);
  });

  it('should play next from queue', () => {
    const track2: MediaItem = { ...mockTrack, id: 'track-2', fileName: 'song2.mp3' };

    store.play(mockTrack);
    store.addToQueue(track2);
    store.playNext();

    expect(store.nowPlaying()?.id).toBe('track-2');
    expect(store.queueLength()).toBe(0);
  });

  it('should stop when queue is empty and playNext is called', () => {
    store.play(mockTrack);
    store.playNext();

    expect(store.nowPlaying()).toBeNull();
    expect(store.playbackStatus()).toBe('idle');
  });
});
