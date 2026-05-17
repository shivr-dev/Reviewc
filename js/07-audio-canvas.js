    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSFX(type) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      if (type === 'yes') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'streak') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.22, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start(); osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      }
    }

    const canvas = document.getElementById('board');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let drawing = false, isEraser = false, lastTap = 0, undoStack = [];
    function saveCanvasState() {
      if (!ctx || !canvas) return;
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.length > 20) undoStack.shift();
    }
    function undoDraw() { if (!ctx) return; if (undoStack.length > 0) ctx.putImageData(undoStack.pop(), 0, 0); }
    function initCanvas() {
      if (!canvas || !ctx) return;
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width; canvas.height = rect.height;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; applyBrushStyle();
      undoStack = [];
    }
    function toggleEraser() {
      isEraser = !isEraser;
      document.getElementById('eraser-btn') && (document.getElementById('eraser-btn').innerText = isEraser ? '橡皮' : '画笔');
      applyBrushStyle();
    }
    function resetEraser() {
      isEraser = false;
      document.getElementById('eraser-btn') && (document.getElementById('eraser-btn').innerText = TRANSLATIONS[currentLang]?.btn_pen || '画笔');
      applyBrushStyle();
    }
    function applyBrushStyle() {
      if (!ctx) return;
      if (isEraser) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 32; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 4; ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--title').trim(); }
    }
    const getPos = e => {
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect(), cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: cx - rect.left, y: cy - rect.top };
    };
    if (canvas) {
      canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = new Date().getTime(), tl = t - lastTap;
        if (tl < 300 && tl > 0 && allowDblClickClear) { clearBoard(); return; }
        lastTap = t; saveCanvasState(); drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y);
      }, { passive: false });
      canvas.addEventListener('touchmove', e => { e.preventDefault(); if (drawing) { const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } }, { passive: false });
      window.addEventListener('touchend', () => drawing = false);
      canvas.addEventListener('mousedown', e => { saveCanvasState(); drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); });
      canvas.addEventListener('mousemove', e => { if (drawing) { const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
      window.addEventListener('mouseup', () => drawing = false);
      canvas.addEventListener('dblclick', () => { if (allowDblClickClear) clearBoard(); });
    }
    function clearBoard() { if (!ctx || !canvas) return; saveCanvasState(); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    function showAns(s) { if (s && isIntenseMode) clearInterval(qTimerInterval); const ap = document.getElementById('ans-pop'); if (ap) { if (s) ap.classList.add('active'); else ap.classList.remove('active'); } }
    function updateProgress() { const pb = document.getElementById('progress-bar'); if (pb) pb.style.width = (filtered.length === 0 ? 0 : ((filtered.length - pool.length) / filtered.length) * 100) + '%'; }
    function peekHint() { const h = document.getElementById('ghost-hint'); if (h) { h.innerText = current ? current.a : ''; h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 1000); } }
    function skipQ() { if (pool.length > 1) { clearInterval(qTimerInterval); nextQ(); } }
