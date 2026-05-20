(() => {
  /* Embed mode. When the prototype is loaded inside the case study iframe
     with ?embed=1, hide the topbar/dock/footnote so only the device shows,
     and accept postMessage({ type: 'go', name }) from the parent to drive
     navigation. */
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1';
  if (isEmbed) document.body.classList.add('is-embed');

  /* Device frame responsive scaling.
     Fits the iPhone frame (414 x 868 incl. bezel padding) inside the
     viewport, leaving room for the side caption on wide screens. */
  (function () {
    const FRAME_W = 414;
    const FRAME_H = 868;
    const MARGIN_Y = 220; // topbar + stage padding + floating dock
    const MARGIN_X = 48;  // stage horizontal padding + cushion
    const CAPTION_W = 360;
    const GAP = 56;
    const BREAKPOINT = 1000;

    function updateDeviceScale() {
      // In embed mode the topbar, dock, and side caption are hidden, so
      // the device gets nearly the full iframe to itself.
      const marginY = isEmbed ? 32 : MARGIN_Y;
      const availH = window.innerHeight - marginY;
      let availW;
      if (!isEmbed && window.innerWidth >= BREAKPOINT) {
        availW = window.innerWidth - MARGIN_X - GAP - CAPTION_W;
      } else {
        availW = window.innerWidth - MARGIN_X;
      }
      const scale = Math.min(availH / FRAME_H, availW / FRAME_W, 1);
      document.documentElement.style.setProperty(
        '--device-scale',
        Math.max(0.4, scale)
      );
    }
    updateDeviceScale();
    window.addEventListener('resize', updateDeviceScale);
  })();

  // Scoped to the focus stage so toggling is-active doesn't affect the
   // always-visible clones inside the filmstrip.
  const screens = document.querySelectorAll('#viewport [data-screen]');
  const jumpBtns = document.querySelectorAll('.dock button');
  const caption = document.getElementById('caption');
  const toast = document.getElementById('toast');

  /* Goals: lifestyle outcomes, up to 3, with the first pick treated as
     primary so we can thread it through later screens. */
  const goalLabels = {
    travel: 'Travel without worry',
    people: 'Keep up with the people I love',
    independent: 'Stay independent',
    energy: 'More energy each day',
    sleep: 'Sleep through the night',
    mind: 'A clear, sharp mind',
    headaches: 'Fewer headaches',
    'long-term': 'Stay well for years to come',
  };
  const goalSelection = ['travel']; // ordered, first is primary

  function syncGoalUI() {
    const pills = document.querySelectorAll('.goal-pill');
    const max = 3;
    pills.forEach((p) => {
      const id = p.dataset.goal;
      const idx = goalSelection.indexOf(id);
      p.classList.toggle('is-on', idx !== -1);
      p.classList.toggle('is-primary', idx === 0);
      const atCap = goalSelection.length >= max && idx === -1;
      p.classList.toggle('is-disabled', atCap);
      p.setAttribute('aria-pressed', String(idx !== -1));
    });
    const countEl = document.getElementById('goals-count');
    if (countEl) countEl.textContent = String(goalSelection.length);
    const cont = document.getElementById('goals-continue');
    if (cont) cont.disabled = goalSelection.length === 0;

    const primaryId = goalSelection[0];
    const primary = primaryId ? goalLabels[primaryId] : '';
    document.querySelectorAll('[data-goal-primary]').forEach((el) => {
      el.textContent = primary;
    });
    document.querySelectorAll('[data-goal-primary-lower]').forEach((el) => {
      el.textContent = primary.toLowerCase();
    });
    const others = Math.max(0, goalSelection.length - 1);
    document.querySelectorAll('[data-goal-others]').forEach((el) => {
      if (others === 0) el.textContent = 'your only goal';
      else if (others === 1) el.textContent = 'and 1 other goal';
      else el.textContent = `and ${others} other goals`;
    });
  }

  document.querySelectorAll('.goal-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const id = pill.dataset.goal;
      const idx = goalSelection.indexOf(id);
      if (idx !== -1) {
        goalSelection.splice(idx, 1);
      } else if (goalSelection.length < 3) {
        goalSelection.push(id);
      }
      syncGoalUI();
    });
  });
  syncGoalUI();

  const captions = {
    welcome:
      "<p><strong>1 · Welcome.</strong> One screen, one promise. Replaces the original 3-frame carousel because users swipe past carousels without reading. The headline names the user's mental model (medication and numbers, not 'treatments'). 'Set up in under 2 minutes' is an explicit time-to-value beat, with clinical and social proof tucked into one line under it.</p>",
    consent:
      "<p><strong>2 · Consent.</strong> Plain-language privacy ask, two short sections (data we need to run the app, analytics for improvement). Footer with the note, primary 'Accept all', and a coral 'Go to settings' link stays pinned even mid-scroll so the action is reachable.</p>",
    goals:
      "<p><strong>4 · Goals.</strong> The motivation anchor. Up to three lifestyle outcomes, with the first pick treated as the primary thread. The options are tuned for an older adult: keep what you have, not build what you don't. The first pick reappears on the handoff card, the day-14 lock-screen reminder, the home screen, and the insights view, so the goal earns its keep every week. The quiet clinical option ('Stay well for years to come') sits last for the pragmatists.</p>",
    'routine-categories':
      "<p><strong>3 · Routine categories.</strong> Four categories presented as a list, not a grid, so each one earns its own row of explanation. The original soft-intro screen above this one is cut, since the categories already speak for themselves. Skip is reachable in the corner so users with one urgent need (medication) are not forced through every category.</p>",
    handoff:
      "<p><strong>5i · Post-medication handoff.</strong> The single highest-leverage screen change. It confirms what just happened ('Lisinopril is set up'), names when the next thing will happen, and hands off to the next step (BP tracking) instead of a generic 1-of-4 grid.</p>",
    'log-bp':
      "<p><strong>6 · Log BP.</strong> Placed right after med setup so the cause-and-effect loop closes on day one: take Lisinopril, log a reading, see the trend. Two large inputs at the top, big enough for older eyes and unsteady taps. Pulse and context are optional. Context tags feed the AI coach later.</p>",
    'routine-hub':
      "<p><strong>7 · Routine hub.</strong> Replaces the original 'Keep going! 1 of 4' framing. The medication step is shown as done with a green tick, not a progress fraction. The remaining categories are optional, named, and reachable. The bottom CTA reads 'I'm done for now' so a single-condition user has a graceful exit.</p>",
    'notification-permission':
      "<p><strong>8 · Notification permission.</strong> The iOS permission dialog is preceded by a plain-language primer that names the three things we'd notify you about. 'Not now' replaces 'No thanks, I'll take the risk' so the experience is not cruel to an anxious user.</p>",
    'push-notif-1':
      "<p><strong>9a · First reminder (day one).</strong> The morning after setup. Calm lock-screen reminder, not a red 'CRITICAL' alarm. Title names the medication so it matches the bottle. The sub ties the pill to the goal in the user's own words: 'The one that brings your numbers down.' No actions, deliberately. Day one is the storytelling moment, so we lead Margaret into the app to see her Home dot strip turn on for the first time.</p>",
    'push-notif-2':
      "<p><strong>9b · Steady-state reminder (week 2+).</strong> Once the habit is forming, the reminder shifts. The sub now reflects progress ('Day 14. Your average is down 6 points.') instead of repeating the goal pitch. Two iOS-style actions reduce friction: 'Mark taken' logs adherence without opening the app, 'Remind me in 15 min' replaces the ambiguous 'Snooze' with a named duration. Storytelling gives way to respect for Margaret's time.</p>",
    today:
      "<p><strong>10 · Home.</strong> The streak is gone. The weekly dot strip is forgiving and recoverable. One missed day is one hollow dot, not 'you broke it.' The BP card is first-class with a trend line. 'Ask MyTherapy' sits as a calm card, not a floating bubble. Tabs are renamed Today, Progress, Treatment, Support. RedPoints leaves the core experience.</p>",
    'today-milestone':
      "<p><strong>11 · Day 14 milestone.</strong> The hybrid model in action. On ordinary days, 'Mark taken' from the lock screen dismisses silently, fastest path. On milestone days (7, 14, 30, target hit, streak recovery), the same tap opens the app to a quiet success state. The dot strip lands on today, the BP card shows the 6-point drop earned in two weeks, and the share-with-doctor export surfaces because this is when Margaret has something worth sharing. The goal she set on day one is named back to her, so the small win connects to the lifestyle outcome that made her open the app in the first place. No confetti, no badges. Numbers and named progress are the reward.</p>",
    treatment:
      "<p><strong>12b · Treatment.</strong> The plain truth of what Margaret takes, when, and why. Indication is named ('For hypertension'). Refill is a date and a relative time, not a system warning. Interaction check is reassurance, not an upsell to a paid tier. The original red 'Silent mode is on' bar is gone, the explanation lives upstream in the reminder setup. Add is a quiet icon button, not a giant pink banner.</p>",
    support:
      "<p><strong>12c · Support.</strong> Real help for a real condition. GP first, AI second, pharmacy and plain-language guides after. No Beta Access ask, no Shop Apotheke ad. Each row says what tapping it gets you, not what it's called.</p>",
    insights:
      "<p><strong>13 · Insights.</strong> The trend chart is the reason a chronic-disease user opens the app on day 30. It shows a target line, a plain-language summary, adherence as a percentage with a calendar grid (not punitive), an AI 'patterns we've noticed' card, and a 'share with your doctor' export that closes the GP loop.</p>",
    'med-add-1':
      "<p><strong>5a · Add medication (entry).</strong> Three ways in. Scan the barcode is the easiest, so it leads. Search by name and Scan plan are equal alternatives. The copy explains what each option does in one line, so Margaret never has to guess.</p>",
    'med-add-2':
      "<p><strong>5b · Search and pick.</strong> Live results as you type. The hint sits above the list so users never feel stuck if their medication is not there. Real names from the package, not generic placeholders.</p>",
    'med-add-3':
      "<p><strong>5c · How often.</strong> Plain-language frequency choice with the most common option pre-selected. 'On demand' is named explicitly so people who only take this when they need it know what to pick.</p>",
    'med-add-4':
      "<p><strong>5d · Reminder time and dose.</strong> Time and dose sit together as quiet rows, not as forms. Critical Alerts are explained in plain language, with the why under the toggle, so the iOS permission dialog on the next screen does not come out of nowhere.</p>",
    'med-add-5':
      "<p><strong>5e · Critical Alerts permission.</strong> Native iOS dialog. We pre-explained on the previous screen so Margaret already knows why we are asking. Either choice carries on, the toggle just records the answer.</p>",
    'med-add-8':
      "<p><strong>5f · What it's for.</strong> The indication picker is the bridge to indication-aware support. We pre-select Hypertension because the prototype assumes Margaret's diagnosis. Multi-select for people on a med for more than one reason. 'I don't know' sits as a quiet, judgement-free option. Inventory and prescriber are deferred out of onboarding and surfaced later, when they earn the user's attention.</p>",
    'deferred-about':
      "<p><strong>14a · About you, deferred.</strong> Pulled out of onboarding so day one stays focused on getting Margaret's medication set up. Resurfaces as a calm prompt on day one evening, after she's logged her first dose. The eyebrow names the moment ('Day 1, evening') so it doesn't feel out of nowhere.</p>",
    'deferred-inventory':
      "<p><strong>14b · Inventory, deferred.</strong> Refill reminders only earn their keep once you've got a routine going. Surfaces in week 2, with a count that's already half the bottle. The pre-fills are opt-out, never demanded.</p>",
    'deferred-prescriber':
      "<p><strong>14c · Prescriber, deferred.</strong> Asking for a GP name on day one made onboarding feel clinical and bureaucratic. Surfacing it after the first refill ties the ask to a moment when Margaret already has Dr. Patel's details to hand, and the value (request future refills, appointment reminders) is concrete.</p>",
  };

  function show(name) {
    /* Track where the BP form should forward after Save. The handoff is
       the only entry into log-bp during onboarding; once the user is
       on Today (or any later screen) the trend chart on Insights is
       the right reward. */
    const active = document.querySelector('.screen.is-active');
    if (name === 'log-bp' && active) {
      bpForwardTarget = active.dataset.screen === 'handoff' ? 'routine-hub' : 'insights';
    }
    screens.forEach((s) => {
      s.classList.toggle('is-active', s.dataset.screen === name);
    });
    // Sub-screens roll up to their parent dock button.
    let topbarKey = name;
    if (name === 'routine-categories') topbarKey = 'routine-categories';
    else if (name.startsWith('med-add-')) topbarKey = 'med-add-1';
    else if (name === 'handoff') topbarKey = 'handoff';
    else if (name === 'treatment' || name === 'support') topbarKey = 'treatment';
    else if (name.startsWith('push-notif-')) topbarKey = 'push-notif-1';
    else if (name.startsWith('deferred-')) topbarKey = 'deferred-about';
    jumpBtns.forEach((b) => {
      b.classList.toggle('is-active', b.dataset.jump === topbarKey);
    });
    if (captions[name]) caption.innerHTML = captions[name];

    // scroll viewport back to top whenever we switch
    const newActive = document.querySelector('.screen.is-active');
    if (newActive) newActive.scrollTop = 0;

    // Mirror the navigation in overview mode: highlight the matching
    // tile and scroll it into view.
    if (document.body.classList.contains('is-overview')) {
      highlightFilmstrip(name);
    }
  }

  function highlightFilmstrip(name) {
    const items = document.querySelectorAll('.filmstrip__item');
    items.forEach((it) => {
      it.classList.toggle('is-current', it.dataset.screen === name);
    });
    const target = document.querySelector(`.filmstrip__item[data-screen="${name}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // top tabs
  jumpBtns.forEach((b) => {
    b.addEventListener('click', () => show(b.dataset.jump));
  });

  /* Embed bridge. Parent posts { type: 'go', name } to switch screens.
     We post { type: 'screen', name } back whenever the active screen
     changes so the parent's section list can stay in sync. */
  if (isEmbed) {
    window.addEventListener('message', (e) => {
      const data = e.data;
      if (data && data.type === 'go' && typeof data.name === 'string') {
        show(data.name);
      }
    });
    const announce = (name) => {
      try {
        window.parent.postMessage({ type: 'screen', name }, '*');
      } catch (_) {}
    };
    const origShow = show;
    show = function (name) {
      origShow(name);
      announce(name);
    };
    // Announce the initial screen on load.
    const first = document.querySelector('.screen.is-active');
    if (first) announce(first.dataset.screen);
  }

  // any element with data-go inside the device
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-go]');
    if (!target) return;
    e.preventDefault();
    show(target.dataset.go);
  });

  // chips toggle
  document.querySelectorAll('.chip:not(.chip--ghost)').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('is-on'));
  });

  // Radio groups (e.g. BP "When", About-you gender). Scope deselection
  // to the nearest fieldset so each group is independent.
  document.querySelectorAll('.radio__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      const group = opt.closest('fieldset') || document;
      group.querySelectorAll('.radio__opt').forEach((o) => o.classList.remove('is-on'));
      opt.classList.add('is-on');
      const r = opt.querySelector('input');
      if (r) r.checked = true;
    });
  });

  // mark-taken
  const markBtn = document.getElementById('mark-taken');
  if (markBtn) {
    markBtn.addEventListener('click', () => {
      const card = document.getElementById('med-card');
      const med = card.querySelector('.med');
      med.classList.add('med--taken');
      markBtn.textContent = 'Taken ✓';
      markBtn.disabled = true;
      flash('Lisinopril marked as taken. Nice.');
    });
  }

  /* BP form. During onboarding (the user has just come through the
     handoff and has no Today screen yet) we forward to the routine
     hub. Once the user has reached Today and is logging from there, we
     forward to Insights so the trend chart pays off the action. */
  let bpForwardTarget = 'routine-hub';
  const form = document.getElementById('bp-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const sys = document.getElementById('sys').value;
      const dia = document.getElementById('dia').value;
      flash(`Saved ${sys}/${dia}. Trend updated.`);
      setTimeout(() => show(bpForwardTarget), 600);
    });
  }

  // toast
  let toastTimer = null;
  function flash(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 1800);
  }

  // ============== Overview / filmstrip view ==============
  const filmstrip = document.getElementById('filmstrip');
  const filmstripScroll = document.getElementById('filmstrip-scroll');
  const viewBtns = document.querySelectorAll('.topbar__view button');

  // Sections group screens into chapters of the user journey.
  // Sub-labels under each phone identify the variant; the chapter
  // heading above carries the section name so we don't repeat it.
  const filmstripSections = [
    {
      number: '1',
      title: 'Welcome',
      blurb: 'One screen, one promise. The original three-frame carousel collapses into a single time-to-value commitment with clinical proof in a single line.',
      screens: [
        { name: 'welcome', sub: 'Outcome, proof, and time-to-value in one frame.' },
      ],
    },
    {
      number: '2',
      title: 'Consent',
      blurb: 'Plain-language privacy ask, with the primary action and a fine-control link pinned in the thumb zone.',
      screens: [
        { name: 'consent', sub: 'Privacy and analytics consent.' },
      ],
    },
    {
      number: '3',
      title: 'Goals',
      blurb: 'A motivation anchor. Up to three lifestyle outcomes that get threaded through reminders, home, and insights so the daily work earns its keep.',
      screens: [
        { name: 'goals', sub: 'Lifestyle outcomes, up to 3.' },
      ],
    },
    {
      number: '4',
      title: 'Select routine',
      blurb: 'Four categories presented as rows, each earning its own row of explanation. Skip is in the corner so single-condition users are not forced through every category.',
      screens: [
        { name: 'routine-categories', sub: 'Pick a starting category.' },
      ],
    },
    {
      number: '5',
      title: 'Add medication',
      blurb: 'A guided flow to add a medication, set reminders, capture what it is for, then hand off to the next step. Inventory and prescriber are deferred out of onboarding and shown later.',
      screens: [
        { name: 'med-add-1', sub: 'Entry. Three ways in.' },
        { name: 'med-add-2', sub: 'Search and pick.' },
        { name: 'med-add-3', sub: 'How often.' },
        { name: 'med-add-4', sub: 'Reminder time and dose.' },
        { name: 'med-add-5', sub: 'Critical Alerts permission.' },
        { name: 'med-add-8', sub: 'What it\'s for.' },
        { name: 'handoff', sub: 'Confirmation, with goal callback.' },
      ],
    },
    {
      number: '6',
      title: 'Log BP',
      blurb: 'Closes the loop right after med setup. Big inputs for older eyes, with optional context tags for the AI coach.',
      screens: [
        { name: 'log-bp', sub: 'First reading.' },
      ],
    },
    {
      number: '7',
      title: 'Routine hub',
      blurb: 'A "you are here" view of the routine so far. Medication shows as done with a tick. Other categories are reachable but optional. The exit reads "I\'m done for now".',
      screens: [
        { name: 'routine-hub', sub: 'Done so far, plus optional next steps.' },
      ],
    },
    {
      number: '8',
      title: 'Notifications',
      blurb: 'Plain-language primer before the iOS permission dialog. Names what we\'d send, and offers a calm "Not now".',
      screens: [
        { name: 'notification-permission', sub: 'Permission primer.' },
      ],
    },
    {
      number: '9',
      title: 'Reminder',
      blurb: 'Calm lock-screen reminders. Day one ties the pill to the goal, then steady-state shifts to one-tap actions once the habit is forming.',
      screens: [
        { name: 'push-notif-1', sub: 'Day one. Goal-tied.' },
        { name: 'push-notif-2', sub: 'Steady state. Goal callback.' },
      ],
    },
    {
      number: '10',
      title: 'Home',
      blurb: 'Weekly dot strip, first-class BP card, the goal kept in view, calm AI assistance.',
      screens: [
        { name: 'today', sub: 'Daily home screen.' },
      ],
    },
    {
      number: '11',
      title: 'Day 14',
      blurb: 'The milestone moment. Tapping Mark taken on a milestone day opens the app to a quiet success state. The dot strip lands, the BP trend earns its place, and the export-to-doctor card surfaces.',
      screens: [
        { name: 'today-milestone', sub: 'Two weeks in. Open from lock screen.' },
      ],
    },
    {
      number: '12',
      title: 'The other tabs',
      blurb: 'Two tabs that replace the original RedPoints, Beta Access, and red "Silent mode" bar. Calm register, no gamification, no marketing.',
      screens: [
        { name: 'treatment', sub: 'Treatment. What you take, when.' },
        { name: 'support', sub: 'Support. People and places that help.' },
      ],
    },
    {
      number: '13',
      title: 'Insights',
      blurb: 'Trend chart, adherence calendar, patterns, and a share-with-doctor export. Wired into the tab bar in place of Progress.',
      screens: [
        { name: 'insights', sub: 'Long-term value view.' },
      ],
    },
    {
      number: '14',
      title: 'Later prompts',
      blurb: 'The questions we cut from onboarding, surfaced as calm prompts when the user has earned the context to answer them. Each is opt-in, with a "Not now" escape.',
      screens: [
        { name: 'deferred-about', sub: 'Day 1, evening. About you.' },
        { name: 'deferred-inventory', sub: 'Week 2. Refill reminders.' },
        { name: 'deferred-prescriber', sub: 'After first refill. Prescriber.' },
      ],
    },
  ];

  function buildFilmstripPhone(name, sub) {
    const original = document.querySelector(`.screen[data-screen="${name}"]`);
    if (!original) return null;

    const item = document.createElement('div');
    item.className = 'filmstrip__item';
    item.dataset.screen = name;

    const wrap = document.createElement('div');
    wrap.className = 'filmstrip__device-wrap';

    const device = document.createElement('div');
    device.className = 'filmstrip__device';

    const notch = document.createElement('div');
    notch.className = 'device__notch';
    notch.setAttribute('aria-hidden', 'true');
    device.appendChild(notch);

    const viewport = document.createElement('div');
    viewport.className = 'filmstrip__viewport';

    const clone = original.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('is-active');
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    viewport.appendChild(clone);
    device.appendChild(viewport);

    const home = document.createElement('div');
    home.className = 'device__home';
    home.setAttribute('aria-hidden', 'true');
    device.appendChild(home);

    wrap.appendChild(device);

    const label = document.createElement('p');
    label.className = 'filmstrip__label';
    label.textContent = sub;

    item.appendChild(wrap);
    item.appendChild(label);
    return item;
  }

  let filmstripBuilt = false;
  function buildFilmstrip() {
    if (filmstripBuilt) return;

    filmstripSections.forEach((section) => {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'filmstrip__section';
      sectionEl.dataset.section = section.number;

      const header = document.createElement('header');
      header.className = 'filmstrip__chapter';
      header.innerHTML = `
        <p class="filmstrip__chapter-eyebrow">Step ${section.number} of 14</p>
        <h2 class="filmstrip__chapter-title">${section.title}</h2>
        <p class="filmstrip__chapter-blurb">${section.blurb}</p>
      `;
      sectionEl.appendChild(header);

      const phones = document.createElement('div');
      phones.className = 'filmstrip__phones';
      section.screens.forEach((s) => {
        const item = buildFilmstripPhone(s.name, s.sub);
        if (item) phones.appendChild(item);
      });
      sectionEl.appendChild(phones);

      filmstripScroll.appendChild(sectionEl);
    });

    filmstripBuilt = true;
    updateFilmScale();
  }

  function setView(mode) {
    const isOverview = mode === 'overview';
    if (isOverview) buildFilmstrip();
    document.body.classList.toggle('is-overview', isOverview);
    filmstrip.hidden = !isOverview;
    viewBtns.forEach((b) => {
      const on = b.dataset.view === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }

  viewBtns.forEach((b) => {
    b.addEventListener('click', () => setView(b.dataset.view));
  });

  // Stop cloned forms from reloading the page on submit (id is stripped
  // from clones so the focus form's submit handler doesn't catch them).
  // Forward Save BP → insights to keep the prototype flow intact.
  filmstripScroll.addEventListener('submit', (e) => {
    e.preventDefault();
    setTimeout(() => show('insights'), 200);
  });

  // Filmstrip phones scale to fit available height — same idea as device-scale,
  // but tuned for showing several at once.
  function updateFilmScale() {
    const FRAME_W = 414;
    const FRAME_H = 868;
    // Reserve room for label + padding + floating dock.
    const availH = window.innerHeight - 260;
    const heightScale = availH / FRAME_H;
    // Clamp so phones don't get unusably small or unnecessarily huge.
    const scale = Math.max(0.32, Math.min(0.55, heightScale));
    document.documentElement.style.setProperty('--film-scale', scale);
  }
  window.addEventListener('resize', updateFilmScale);

  // arrow keys navigation
  const order = ['welcome', 'consent', 'goals', 'routine-categories', 'med-add-1', 'med-add-2', 'med-add-3', 'med-add-4', 'med-add-5', 'med-add-8', 'handoff', 'log-bp', 'routine-hub', 'notification-permission', 'push-notif-1', 'push-notif-2', 'today', 'today-milestone', 'treatment', 'support', 'insights', 'deferred-about', 'deferred-inventory', 'deferred-prescriber'];
  document.addEventListener('keydown', (e) => {
    const active = document.querySelector('.screen.is-active');
    if (!active) return;
    const idx = order.indexOf(active.dataset.screen);
    if (e.key === 'ArrowRight' && idx < order.length - 1) show(order[idx + 1]);
    if (e.key === 'ArrowLeft' && idx > 0) show(order[idx - 1]);
  });

})();
