# Video Compression for Storage & Fast Stream Decompression

Research into compressing stored video files on disk and decompressing them on-the-fly for streaming.

---

## The Core Question

> Can we wrap video files in a file-level compression format (like zip, but streamable) to save disk space, then decompress sequentially so the first bytes out are the first second of video?

**Short answer: No, it's not worth it.** Video files are already compressed by the codec. Applying a general-purpose compressor on top yields near-zero savings. The codec IS the compression layer — the way to shrink video on disk is to use a better codec or more aggressive codec settings.

---

## Why File-Level Compression Fails on Video

### The data is already compressed

Video codecs (H.264, H.265, AV1) produce output that is essentially random-looking data with no exploitable redundancy left. General-purpose compressors work by finding repeated patterns — but the codec already squeezed those out.

Real-world results from compressing an MP4 with various tools:

| Method | Original | Compressed | Savings |
|--------|----------|------------|---------|
| ZIP | 1,790,044 B | 1,790,044 B | ~0% |
| Gzip | 1,790,044 B | 1,789,512 B | ~0.03% |
| Bzip2 | 1,790,044 B | 775,138 B | ~56% * |

\* Bzip2's result looks promising but this was a small test file. On real-world full-length videos with high bitrate codecs, the savings collapse to 1-5% at most. The compressible parts are mostly container metadata (headers, index tables, subtitle tracks) which are a tiny fraction of the file.

### What about the uncompressed parts?

An MP4 file contains:
- **Video stream** (~95%+ of file): already compressed by the codec — incompressible
- **Audio stream** (~3-5%): already compressed (AAC, Opus) — incompressible
- **Metadata** (moov atom, timestamps, chapters): ~0.1-1% — compressible but trivial

Even if you compressed the metadata to zero, you'd save less than 1% of the total file size.

---

## Approaches Investigated

### 1. Seekable ZSTD (Facebook's seekable format)

**What it is**: ZSTD files split into independently-decompressible frames with a seek table at the end. Allows random access without decompressing the whole file.

**How it works**:
- Input is chunked into frames (e.g., 1 MB each)
- Each frame is compressed independently
- A seek table maps `uncompressed offset → compressed offset`
- To read byte range X-Y, find the right frame, decompress only that frame

**Would it work for streaming?** Yes, the architecture supports it — you can decompress frame by frame and pipe to the HTTP response. First frames = first seconds of video.

**But**: It won't save meaningful space on video data. ZSTD on already-compressed video achieves roughly 0-2% reduction. You'd add CPU overhead and complexity for no real benefit.

**Where seekable ZSTD shines**: logs, databases, JSON archives — data that is NOT already compressed.

### 2. Compressed Filesystems (SquashFS, EROFS)

**What they are**: Read-only filesystems where files are transparently compressed on disk and decompressed on read. The application sees normal files.

**SquashFS**: Mature, kernel-level support on Linux, supports zstd/lz4/gzip. Mount it and all reads are decompressed on the fly.

**EROFS**: Newer, optimized for random reads, used by Android. Supports zstd compression with per-cluster independent decompression.

**Would they work?** Transparently, yes — your .NET app would read files as normal. The kernel handles decompression.

**But**: Same fundamental problem. The filesystem compressor can't shrink data that's already compressed by the video codec. You'd get ~0-2% savings and pay CPU cost on every read.

### 3. Re-encoding to a Better Codec (the actual answer)

This is the only approach that meaningfully reduces video file size. A more efficient codec analyzes the visual content and finds better ways to represent it.

| Codec | Compression vs H.264 | Savings |
|-------|----------------------|---------|
| H.264 | Baseline | 0% |
| H.265 | ~40-45% smaller | 40-45% |
| AV1 | ~50% smaller | 50% |
| AV2 | ~60% smaller (est.) | 60% (early stage) |

Re-encoding a 10 GB H.264 movie to AV1 → ~5 GB. That's a real 50% savings, not the 0-2% from file-level compression.

---

## Codec-Level Compression Details

Since re-encoding is the only viable path, here are the specifics.

### Codec Comparison

| Codec | Compression vs H.264 | Encode Speed (1x = H.264) | Decode HW Accel | Browser Support |
|-------|----------------------|---------------------------|------------------|-----------------|
| H.264 (libx264) | baseline | 1x | Universal | 100% |
| H.265 (libx265) | ~40-45% smaller | 0.3-0.5x | Patchy in browsers | Inconsistent (patent issues) |
| AV1 (libsvtav1) | ~50% smaller | 0.3-0.6x (SVT-AV1) | Intel 11th+, NVIDIA RTX 30+, AMD RX 6000+ | Chrome, Firefox, Edge, Safari 17+ |

### Verdict

**AV1 via SVT-AV1** is the best choice for Flish:
- 50% smaller files than H.264 at equivalent quality
- SVT-AV1 encoding speed is practical (not the glacial libaom encoder)
- Hardware decode is standard on any device from 2021+
- Browser support is broad: Chrome 70+, Firefox 67+, Edge 121+, Safari 17+
- Royalty-free (unlike H.265)

**H.264 as fallback** when encoding speed matters more or max device compatibility is needed.

**H.265 is not recommended** — inconsistent browser support and patent licensing headaches.

---

## Container Format

**Use MP4** with `moov` atom at the front (faststart). This is non-negotiable for web streaming.

| Container | Browser Playback | Seeking | Adaptive Streaming | Recommendation |
|-----------|-----------------|---------|-------------------|----------------|
| MP4 | 98%+ | Excellent (with faststart) | HLS, DASH, CMAF | Use this |
| MKV | Unsupported natively | Good locally | None | Archive/local only |
| WebM | Good (VP9/AV1 only) | Decent | Limited | Acceptable alternative |

### Why faststart matters

By default, FFmpeg writes the `moov` atom (metadata index) at the **end** of the file. Players must download the entire file before they can seek. With `-movflags +faststart`, the moov atom moves to the front, enabling:
- Instant playback start on progressive download
- Frame-accurate seeking via HTTP range requests
- No full-file download required

---

## Recommended FFmpeg Commands

### Tier 1: AV1 (Best compression, good decode speed)

```bash
# High quality archival (slow encode, smallest files)
ffmpeg -i input.mkv \
  -c:v libsvtav1 -preset 6 -crf 28 \
  -g 240 \
  -c:a libopus -b:a 128k \
  -movflags +faststart \
  output.mp4

# Balanced (moderate encode speed, good compression)
ffmpeg -i input.mkv \
  -c:v libsvtav1 -preset 8 -crf 30 \
  -g 240 \
  -c:a libopus -b:a 128k \
  -movflags +faststart \
  output.mp4

# Fast encode (for quick processing, still better than H.264)
ffmpeg -i input.mkv \
  -c:v libsvtav1 -preset 10 -crf 35 \
  -g 240 \
  -c:a libopus -b:a 128k \
  -movflags +faststart \
  output.mp4
```

### Tier 2: H.264 (Maximum compatibility fallback)

```bash
ffmpeg -i input.mkv \
  -c:v libx264 -preset slow -crf 20 \
  -profile:v high -level 4.1 \
  -g 250 \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  output.mp4
```

### Remux only (move moov atom, no re-encode)

```bash
ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4
```

---

## Parameter Reference

### CRF (Constant Rate Factor)

Controls quality vs file size. Lower = better quality, larger files.

| Codec | Visually Lossless | High Quality | Balanced | Aggressive |
|-------|-------------------|--------------|----------|------------|
| H.264 | 18 | 20 | 23 | 28 |
| SVT-AV1 | 22 | 28 | 30-32 | 38-42 |

### Preset (SVT-AV1)

Controls encode speed vs compression efficiency (0-12, lower = slower + better).

| Preset | Use Case | Encode Speed | Compression |
|--------|----------|-------------|-------------|
| 2-4 | Archival, max compression | Very slow | Best |
| 6 | High quality storage | Slow | Excellent |
| 8 | Balanced | Moderate | Good |
| 10 | Quick processing | Fast | Acceptable |
| 12 | Near-realtime | Very fast | Worse |

### Keyframe interval (-g)

Controls seeking granularity. A keyframe every N frames.

- `-g 240` at 24fps = keyframe every 10 seconds (good balance)
- `-g 120` at 24fps = keyframe every 5 seconds (better seeking, ~5% larger)
- `-g 48` at 24fps = keyframe every 2 seconds (very fast seeking, larger files)

For Flish streaming, `-g 240` (10s) is a good default. Use `-g 120` if users frequently scrub through videos.

---

## Recommendations for Flish

### Storage transcode pipeline

1. **Codec**: SVT-AV1 with preset 6, CRF 28-30
2. **Audio**: Opus at 128kbps (or AAC 192kbps for wider player support)
3. **Container**: MP4 with `-movflags +faststart`
4. **Keyframes**: `-g 240` for 10-second seeking intervals

### Expected space savings

For a typical 1080p video at H.264 CRF 20 (high quality):
- Original H.264: ~5 GB/hour
- AV1 CRF 28: ~2-2.5 GB/hour (50-60% reduction)
- AV1 CRF 32: ~1.5-2 GB/hour (60-70% reduction)

### Decode performance

AV1 decoding is hardware-accelerated on:
- Intel 11th gen+ (Tiger Lake, 2020+)
- NVIDIA RTX 30 series+ (2020+)
- AMD RX 6000 series+ (2020+)
- Apple M1+ (2020+)
- All modern phones (2022+)

Software decode is feasible for 1080p on any modern CPU but will use more power than hardware decode.

### Trade-off matrix

| Priority | Codec | Preset | CRF | Result |
|----------|-------|--------|-----|--------|
| Minimum storage | SVT-AV1 | 4 | 32 | Smallest files, very slow encode |
| Best balance | SVT-AV1 | 6 | 28 | Great compression, reasonable encode |
| Fast processing | SVT-AV1 | 10 | 35 | Quick encode, still beats H.264 |
| Max compatibility | H.264 | slow | 20 | Plays everywhere, larger files |

---

## Bottom Line

There is no "zip for video" that saves meaningful disk space while allowing sequential streaming decompression. The video codec already IS the compression — it has squeezed out all the redundancy. Wrapping an MP4 in zstd/gzip/bzip2 gives 0-2% savings and adds CPU overhead and complexity for nothing.

The real lever for saving disk space is **re-encoding to a more efficient codec**. Going from H.264 to AV1 saves ~50% with no perceptual quality loss — that's the equivalent of doubling your VPS storage for free.
