import { Composition } from 'remotion';
import { Reel } from './Reel';
import { AutoReel } from './AutoReel';
import { FPS, totalOf, DEFAULT_TIMINGS } from './timeline';

const DEMO = {
  script: { id: 'demo', title: 'demo', scenes: [{ id: 'hook', voice: 'Демо', caption: [['*Демо']], pose: 'wave', visual: { type: 'big', value: 'AI', label: 'демо' } }] },
  timings: [{ id: 'hook', text: 'Демо', durationMs: 2000, words: [{ text: 'Демо', start: 100, end: 600 }] }],
  voiceBase: 'static:reelvoice/',
  settings: {},
};

export const Root = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={totalOf(DEFAULT_TIMINGS)} fps={FPS} width={1080} height={1920} defaultProps={{ settings: {} }} />
    <Composition
      id="AutoReel"
      component={AutoReel}
      durationInFrames={300}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={DEMO}
      calculateMetadata={({ props }) => ({ durationInFrames: totalOf(props.timings) })}
    />
  </>
);
