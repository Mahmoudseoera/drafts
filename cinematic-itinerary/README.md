# The river remembers

Open `index.html` through the project's local server. The page is separate from the existing homepage. Images and a synthesized 20-second water-like soundscape are local; GSAP 3.13.0, ScrollTrigger and Lenis 1.3.11 load from pinned CDN URLs. Booking links lead to the project's existing tailor-made enquiry page.

Desktop screens wider than 900px and at least 700px high get a pinned 1 → 1.35 hero zoom and a 400%-wide timeline translated by -75%. Container-based triggers reveal the day content and animate image parallax. Lenis runs on GSAP's ticker. Day links and keyboard focus map to the relevant position in the pinned scene.

Mobile, short windows, reduced-motion preferences, or blocked animation libraries use the visible vertical layout. The first day starts open, with individual and global expand controls. Changing the media query cleans up pins, transforms and Lenis. Pointer tilt is disabled for touch and reduced motion.

Audio starts only after pressing Sound off. HTML5 audio volume fades over 800ms, rapid toggles invalidate stale playback promises, and hiding/leaving the page pauses playback. The soundscape is original synthesized noise, not a field recording. Some mobile browsers control media volume at the device level; volume ramps should be verified there.

`node --check cinematic-itinerary/app.js` checks syntax. `node --test cinematic-itinerary/itinerary.test.cjs` checks library-free initialization, day controls, audio interactions and local media integrity using mocks. These checks do not establish rendered layout, actual sound quality or frame rate. No browser is available in this session; desktop/mobile animation, resize, keyboard and audio checks remain pending.

Implementation references: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/), and [Lenis integration](https://github.com/darkroomengineering/lenis).
