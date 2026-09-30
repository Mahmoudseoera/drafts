/* Progressive enhancement: the complete document works before GSAP loads.
   Mobile, short screens and reduced-motion visitors keep native scrolling. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const dayDetails = $$('.day details');
  const dayLinks = $$('.day-nav a');
  let lenis = null;
  let horizontal = null;
  let activeDay = -1;

  // Day expansion works independently of the animation libraries.
  function syncDayButton() {
    const allOpen = dayDetails.every(detail => detail.open);
    $('#toggle-days').setAttribute('aria-expanded',String(allOpen));
    $('#toggle-days').innerHTML = `${allOpen?'Close':'Open'} all days <span aria-hidden="true">${allOpen?'−':'＋'}</span>`;
  }
  $('#toggle-days').addEventListener('click',() => {
    const open = !dayDetails.every(detail=>detail.open);
    dayDetails.forEach(detail => { detail.open = open; });
    syncDayButton();
  });
  dayDetails.forEach(detail=>detail.addEventListener('toggle',()=>{
    syncDayButton();
    // Opening text can alter the height of a vertical fallback card.
    if (!horizontal && window.ScrollTrigger) ScrollTrigger.refresh();
  }));
  function setDay(index) {
    if (activeDay === index) return;
    activeDay = index;
    $('#day-indicator').textContent = `DAY ${String(index+1).padStart(2,'0')} — 04`;
    dayLinks.forEach((link,i)=>i===index?link.setAttribute('aria-current','step'):link.removeAttribute('aria-current'));
  }
  function goTo(target, immediate = false) {
    if (lenis) lenis.scrollTo(target,{immediate,duration:1.1});
    else if (typeof target === 'number') window.scrollTo({top:target,behavior:immediate?'instant':'smooth'});
    else target.scrollIntoView({behavior:immediate?'instant':'smooth',block:'start'});
  }
  // Map day links to the vertical position of the pinned horizontal timeline.
  // Native hash scrolling cannot account for transformed cards inside a pin.
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const hash=link.getAttribute('href');
    const target=$(hash);
    if(!target)return;
    event.preventDefault();
    const dayIndex=$$('.day').indexOf(target);
    const trigger=horizontal?.scrollTrigger;
    const position=dayIndex>=0 && trigger ? trigger.start+(trigger.end-trigger.start)*(dayIndex/3) : target;
    goTo(position,reduceMotion.matches);
    // Focus the section itself, not a later off-screen interactive child.
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
  });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const media=gsap.matchMedia();
    media.add({desktop:'(min-width: 901px) and (min-height: 700px)',motion:'(prefers-reduced-motion: no-preference)'},context=>{
      const cinematic=context.conditions.desktop && context.conditions.motion;
      if(!cinematic)return;
      document.documentElement.classList.add('is-horizontal');

      // One clock for Lenis and GSAP avoids duplicate animation loops.
      const tick = seconds => lenis?.raf(seconds*1000);
      if(window.Lenis){
        lenis=new Lenis({autoRaf:false,duration:1.1,smoothWheel:true,syncTouch:false,anchors:false,prevent:node=>node.classList?.contains('day-copy') && node.scrollHeight>node.clientHeight});
        lenis.on('scroll',ScrollTrigger.update);
        gsap.ticker.add(tick);gsap.ticker.lagSmoothing(0);
      }
      // Keep percentage centering separate from the animated -50px offset.
      gsap.set('.hero-copy',{yPercent:-43,y:0});
      const hero=gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:()=>`+=${window.innerHeight*.85}`,pin:true,scrub:1,anticipatePin:1,invalidateOnRefresh:true}});
      hero.to('.hero-image',{scale:1.35,ease:'none'},0)
        .to('.hero-copy',{opacity:0,y:-50,ease:'none'},0)
        .to('.hero-bottom',{opacity:0,ease:'none'},0);

      horizontal=gsap.to('.journey-track',{xPercent:-75,ease:'none',scrollTrigger:{trigger:'.journey',start:'top top',end:()=>`+=${window.innerWidth*3}`,pin:true,pinSpacing:true,scrub:1,anticipatePin:1,invalidateOnRefresh:true,onUpdate:self=>setDay(Math.min(3,Math.round(self.progress*3)))}});
      gsap.fromTo('.journey-progress span',{scaleX:.25},{scaleX:1,ease:'none',scrollTrigger:{trigger:'.journey',start:'top top',end:()=>`+=${window.innerWidth*3}`,scrub:true}});

      $$('.day').forEach((day,index)=>{
        const image=day.querySelector('.day-visual img');
        // Parallax is inside each moving card, with overscan to prevent gaps.
        gsap.fromTo(image,{xPercent:-9},{xPercent:0,ease:'none',scrollTrigger:{trigger:day,containerAnimation:horizontal,start:'left right',end:'right left',scrub:true}});
        const text=day.querySelectorAll('.day-copy > .eyebrow,.day-copy h3,.day-intro,.activities > div');
        gsap.fromTo(text,{opacity:.25,y:22},{opacity:1,y:0,duration:.65,stagger:.06,ease:'power2.out',scrollTrigger:{trigger:day,containerAnimation:horizontal,start:index===0?'left 95%':'left 55%',toggleActions:'play none none reverse',onEnter:()=>{dayDetails[index].open=true;syncDayButton();}}});
      });
      // Keyboard tabbing to an off-screen day must reveal that day immediately.
      const onDayFocus=event=>{
        const day=event.target.closest('.day');
        if(!day || event.target===day)return;
        const index=$$('.day').indexOf(day);
        if(index===activeDay)return;
        const trigger=horizontal.scrollTrigger;
        goTo(trigger.start+(trigger.end-trigger.start)*index/3,true);
        horizontal.progress(index/3);setDay(index);
      };
      $('.journey-track').addEventListener('focusin',onDayFocus);
      $$('.moment-tilt img').forEach(image=>gsap.fromTo(image,{yPercent:-5},{yPercent:3,ease:'none',scrollTrigger:{trigger:image.closest('.moment-card'),start:'top bottom',end:'bottom top',scrub:true}}));
      ScrollTrigger.refresh();
      return ()=>{
        $('.journey-track').removeEventListener('focusin',onDayFocus);
        gsap.ticker.remove(tick);lenis?.destroy();lenis=null;horizontal=null;
        document.documentElement.classList.remove('is-horizontal');
        // Restore the requested first-open mobile starting state on mode changes.
        dayDetails.forEach((detail,index)=>{detail.open=index===0;});syncDayButton();
      };
    });
    // Images have explicit aspect dimensions; refreshing after decode catches
    // any final layout differences without refreshing continuously on scroll.
    window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
    document.fonts?.ready.then(()=>ScrollTrigger.refresh());
  }

  // In fallback mode the active day follows the regular vertical document.
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      if(horizontal)return;
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
      if(visible.length)setDay($$('.day').indexOf(visible[0].target));
    },{threshold:[.15,.4,.65]});
    $$('.day').forEach(day=>observer.observe(day));
  }

  // Pointer tilt uses one pending RAF per card, cached geometry per entry, and
  // no animation on coarse pointers or reduced-motion devices.
  const tiltResets=[];
  $$('.moment-card').forEach(card=>{
    const surface=card.querySelector('.moment-tilt');
    let frame=0,rect=null,x=0,y=0;
    const reset=()=>{cancelAnimationFrame(frame);frame=0;rect=null;surface.style.transform='';surface.style.willChange='';};
    tiltResets.push(reset);
    card.addEventListener('pointerenter',()=>{if(finePointer.matches && !reduceMotion.matches){rect=card.getBoundingClientRect();surface.style.willChange='transform';}});
    card.addEventListener('pointermove',event=>{
      if(!finePointer.matches || reduceMotion.matches)return;
      if(!rect){rect=card.getBoundingClientRect();surface.style.willChange='transform';}
      x=Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/rect.width-.5));
      y=Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/rect.height-.5));
      if(!frame)frame=requestAnimationFrame(()=>{surface.style.transform=`perspective(1000px) rotateX(${-y*9}deg) rotateY(${x*11}deg)`;frame=0;});
    });
    card.addEventListener('pointerleave',reset);card.addEventListener('pointercancel',reset);
  });
  reduceMotion.addEventListener('change',()=>tiltResets.forEach(reset=>reset()));
  finePointer.addEventListener('change',()=>tiltResets.forEach(reset=>reset()));
  window.addEventListener('resize',()=>tiltResets.forEach(reset=>reset()),{passive:true});
  window.addEventListener('scroll',()=>tiltResets.forEach(reset=>reset()),{passive:true});

  // HTMLMediaElement playback starts only inside a user gesture. A generation
  // counter makes rapid toggling safe while play() or a volume fade is pending.
  const audio=$('#ambient-audio');
  const soundButton=$('#sound-toggle');
  let wantsSound=false,audioVersion=0,fadeFrame=0;
  audio.volume=0;
  function soundUI(on){
    soundButton.setAttribute('aria-pressed',String(on));
    soundButton.setAttribute('aria-label',on?'Mute ambient sound':'Enable ambient sound');
    $('#sound-label').textContent=on?'Sound on':'Sound off';
  }
  function fadeVolume(target,complete=()=>{}){
    cancelAnimationFrame(fadeFrame);
    const from=audio.volume,start=performance.now(),duration=800;
    const step=now=>{
      const progress=Math.min(1,(now-start)/duration);
      audio.volume=Math.max(0,Math.min(1,from+(target-from)*progress));
      if(progress<1)fadeFrame=requestAnimationFrame(step);
      else{fadeFrame=0;complete();}
    };
    fadeFrame=requestAnimationFrame(step);
  }
  function stopAudio(){
    audioVersion++;wantsSound=false;cancelAnimationFrame(fadeFrame);fadeFrame=0;audio.pause();audio.volume=0;soundUI(false);
  }
  soundButton.addEventListener('click',async()=>{
    wantsSound=!wantsSound;
    const ticket=++audioVersion;
    cancelAnimationFrame(fadeFrame);soundUI(wantsSound);
    $('#audio-status').textContent='';
    if(!wantsSound){fadeVolume(0,()=>{if(ticket===audioVersion)audio.pause();});return;}
    try{
      await audio.play();
      if(ticket!==audioVersion)return;
      fadeVolume(.3);
      $('#audio-status').textContent='Ambient water sound enabled.';
    }catch(_){
      if(ticket!==audioVersion)return;
      stopAudio();$('#audio-status').textContent='Sound could not start. Please try again.';
    }
  });
  audio.addEventListener('error',()=>{stopAudio();$('#audio-status').textContent='Ambient sound is unavailable. You can continue exploring.';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
  window.addEventListener('pagehide',stopAudio);
  // Structured data follows the visible itinerary instead of a second static
  // copy. This is an inspirational trip; no fabricated offer or price is added.
  const schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.textContent=JSON.stringify({
    '@context':'https://schema.org','@type':'TouristTrip',
    name:$('#hero-title').textContent,
    description:$('meta[name="description"]').content,
    itinerary:{'@type':'ItemList',itemListElement:$$('.day').map((day,index)=>({
      '@type':'ListItem',position:index+1,item:{'@type':'Place',name:day.querySelector('.day-copy .eyebrow').textContent.split('·').pop().trim()}
    }))}
  });
  document.head.append(schema);
  syncDayButton();
})();
