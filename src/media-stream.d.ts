// src/media-stream.d.ts

// This file extends the built-in TypeScript types for the MediaStream API.
// It teaches TypeScript that 'torch' is a valid capability and constraint.

interface MediaTrackCapabilities {
  torch?: boolean;
}

interface MediaTrackConstraintSet {
  torch?: boolean;
}
