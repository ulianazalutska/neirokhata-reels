import { Composition } from 'remotion';
import { Reel } from './Reel';
import { TOTAL, FPS } from './timeline';

export const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ settings: {} }} />
);
