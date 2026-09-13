/**
 * Tony Tech Digital Solutions — Version 7
 * Mobile menu · Scroll spy · Reveals · Voice assistant
 */

(function () {
  'use strict';

  var header = document.getElementById('header');
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-menu');
  var links = document.querySelectorAll('.nav-link');
  var yearEl = document.getElementById('year');
  var sections = document.querySelectorAll('section[id]');
  var fadeEls = document.querySelectorAll('.fade-section');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
  }

  function openMenu() {
    if (!menu || !toggle) return;
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '✕';
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });
    links.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 800) closeMenu();
    });
  }

  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  function updateActiveNav() {
    var scrollPos = window.scrollY + 120;
    var current = '';
    sections.forEach(function (section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = section.getAttribute('id');
      }
    });
    links.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === current);
    });
  }
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  if ('IntersectionObserver' in window && fadeEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    fadeEls.forEach(function (el) { observer.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ========== Voice Assistant ========== */
  var fab = document.getElementById('va-fab');
  var panel = document.getElementById('va-panel');
  var closeBtn = document.getElementById('va-close');
  var messages = document.getElementById('va-messages');
  var input = document.getElementById('va-input');
  var sendBtn = document.getElementById('va-send');
  var micBtn = document.getElementById('va-mic');
  var statusEl = document.getElementById('va-status');
  var hintEl = document.getElementById('va-hint');
  var modeTextBtn = document.getElementById('va-mode-text');
  var modeVoiceBtn = document.getElementById('va-mode-voice');

  if (!fab || !panel) return;

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var isListening = false;
  var isSpeaking = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  } else if (hintEl) {
    hintEl.textContent = 'Voice input is not supported in this browser. You can still type.';
  }

  var replyMode = 'text';
  try {
    var saved = localStorage.getItem('tonytech_va_reply_mode');
    if (saved === 'text' || saved === 'voice') replyMode = saved;
  } catch (e) {}

  function setStatus(text, mode) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove('listening', 'speaking');
    if (mode) statusEl.classList.add(mode);
  }

  function setReplyMode(mode, announce) {
    var prev = replyMode;
    replyMode = mode === 'voice' ? 'voice' : 'text';
    try { localStorage.setItem('tonytech_va_reply_mode', replyMode); } catch (e) {}
    if (modeTextBtn && modeVoiceBtn) {
      modeTextBtn.classList.toggle('active', replyMode === 'text');
      modeVoiceBtn.classList.toggle('active', replyMode === 'voice');
      modeTextBtn.setAttribute('aria-pressed', replyMode === 'text' ? 'true' : 'false');
      modeVoiceBtn.setAttribute('aria-pressed', replyMode === 'voice' ? 'true' : 'false');
    }
    if (replyMode === 'text') {
      stopSpeaking();
      setStatus('Text replies');
    } else {
      setStatus('Voice replies on');
    }
    if (announce && prev !== replyMode && messages) {
      addMessage(
        replyMode === 'voice'
          ? 'Voice mode on. Tap the microphone and speak — I will reply out loud.'
          : 'Text mode on. I will reply in writing only.',
        'bot'
      );
    }
  }

  setReplyMode(replyMode);
  if (modeTextBtn) modeTextBtn.addEventListener('click', function () { setReplyMode('text', true); });
  if (modeVoiceBtn) modeVoiceBtn.addEventListener('click', function () { setReplyMode('voice', true); });

  function openPanel() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Close Tony Tech voice assistant');
    if (input) setTimeout(function () { input.focus(); }, 50);
  }

  function closePanel() {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Open Tony Tech voice assistant');
    stopListening();
    stopSpeaking();
    fab.focus();
  }

  fab.addEventListener('click', function () {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) {
      e.preventDefault();
      closePanel();
    }
  });

  function addMessage(text, type) {
    var div = document.createElement('div');
    div.className = 'va-msg va-msg-' + type;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      setStatus('Ready');
      return;
    }
    stopSpeaking();
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.lang = 'en-US';
    isSpeaking = true;
    setStatus('Speaking…', 'speaking');
    utter.onend = function () {
      isSpeaking = false;
      setStatus(replyMode === 'voice' ? 'Tap mic to speak again' : 'Ready');
    };
    utter.onerror = function () {
      isSpeaking = false;
      setStatus('Ready');
    };
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    isSpeaking = false;
  }

  function stopListening() {
    if (recognition && isListening) {
      try { recognition.stop(); } catch (e) {}
    }
    isListening = false;
    if (micBtn) micBtn.classList.remove('active');
    if (fab) fab.classList.remove('listening');
  }

  function getReply(query) {
    var q = (query || '').toLowerCase().trim();
    if (!q) return 'Please ask about our services, process, work, or how to start a project.';
    if (/hello|hi\b|hey|good (morning|afternoon|evening)/.test(q)) {
      return 'Hello. Welcome to Tony Tech Digital Solutions. How can I help you today?';
    }
    if (/who (are you|is tony)|about|what is tony tech|company/.test(q)) {
      return 'Tony Tech Digital Solutions helps individuals, businesses and brands turn ideas into modern digital experiences. We combine software, IT, AI creativity and practical thinking to deliver solutions that make an impact.';
    }
    if (/service|what (do you|can you)|offer|provide/.test(q)) {
      return 'We offer Software Development, IT Support, Digital Solutions, AI Creative Services, Digital Design, and Image Restoration. Ask about any of these for more detail.';
    }
    if (/software|website|web (dev|site|tool)|app/.test(q)) {
      return 'Software Development covers custom digital tools, websites and software designed around your needs.';
    }
    if (/it support|technical support|fix/.test(q)) {
      return 'IT Support provides reliable technical help and practical solutions to keep your digital work running smoothly.';
    }
    if (/digital solution/.test(q)) {
      return 'Digital Solutions are modern systems and technology setups that help businesses work smarter.';
    }
    if (/ai|artificial|video|image generation|creative service/.test(q)) {
      return 'AI Creative Services include AI-powered videos, image generation, creative visuals and digital content.';
    }
    if (/design|flyer|banner|branding|graphic/.test(q)) {
      return 'Digital Design covers professional flyers, banners, branding assets and visual content.';
    }
    if (/restor|old photo|damaged|photograph/.test(q)) {
      return 'Image Restoration brings old, damaged or abandoned photographs back to life with modern restoration techniques.';
    }
    if (/process|how (do you|does it) work|steps|workflow/.test(q)) {
      return 'Our process is Discover, Design, Build, then Impact. We understand your goals, plan the experience, build the solution, and help it deliver results.';
    }
    if (/work|portfolio|project|example|deliver/.test(q)) {
      return 'Our work includes Business Websites, Digital Brand Systems, Custom Web Tools, AI Video Projects, AI Image Creation and Creative Designs. See the Work section on this page.';
    }
    if (/why|choose|different|better/.test(q)) {
      return 'We focus on creative thinking, modern technology, professional results, and turning vision into reality.';
    }
    if (/contact|whatsapp|email|reach|phone|call|message|number/.test(q)) {
      return 'You can reach Tony Tech on WhatsApp at 0811 553 1812, or by email at obianthonychima@gmail.com. Use the buttons in the Contact section to message us directly.';
    }
    if (/price|cost|how much|package|fee|naira|₦/.test(q)) {
      return 'Pricing depends on the project scope. Share your idea through Contact and we can discuss a suitable package.';
    }
    if (/start|begin|hire|book|project/.test(q)) {
      return 'Great. Open the Contact section — tap Chat on WhatsApp (0811 553 1812) or Send an Email (obianthonychima@gmail.com) to get started.';
    }
    if (/thank|thanks|appreciate/.test(q)) {
      return 'You are welcome. Feel free to ask anything else about Tony Tech.';
    }
    if (/bye|goodbye|see you|close/.test(q)) {
      return 'Thank you for visiting Tony Tech Digital Solutions. Build smarter. Think bigger.';
    }
    return 'I can help with services, our process, portfolio categories, or how to start a project. Try asking: What services do you offer? or How do you work?';
  }

  function handleUserText(text) {
    text = (text || '').trim();
    if (!text) return;
    addMessage(text, 'user');
    var reply = getReply(text);
    addMessage(reply, 'bot');
    if (replyMode === 'voice') speak(reply);
    else {
      stopSpeaking();
      setStatus('Ready — switch to Voice to hear replies');
    }
  }

  function submitInput() {
    if (!input) return;
    var text = input.value;
    input.value = '';
    handleUserText(text);
  }

  if (sendBtn) sendBtn.addEventListener('click', submitInput);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitInput();
      }
    });
  }

  if (micBtn && recognition) {
    micBtn.addEventListener('click', function () {
      if (isListening) {
        stopListening();
        setStatus('Ready');
        return;
      }
      stopSpeaking();
      try {
        recognition.start();
        isListening = true;
        micBtn.classList.add('active');
        if (fab) fab.classList.add('listening');
        setStatus('Listening… speak now', 'listening');
      } catch (err) {
        setStatus('Mic unavailable');
        isListening = false;
      }
    });

    recognition.onresult = function (event) {
      var transcript = event.results[0][0].transcript;
      stopListening();
      setStatus('Ready');
      handleUserText(transcript);
    };

    recognition.onerror = function () {
      stopListening();
      setStatus('Ready');
      addMessage('I could not catch that. Please try again or type your question.', 'bot');
    };

    recognition.onend = function () {
      stopListening();
      if (!isSpeaking) setStatus('Ready');
    };
  } else if (micBtn) {
    micBtn.addEventListener('click', function () {
      addMessage('Voice input is not available in this browser. Please type your question.', 'bot');
    });
  }
})();
