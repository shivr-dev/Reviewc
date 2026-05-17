    function openSettingsFromLearning() { openPanel('settings'); }

    function startNewLearning() {
      closeAllPanels(); activeSession = null;
      document.getElementById('home-view').style.display = 'none';
      document.getElementById('learning-view').style.display = 'flex';
      document.querySelector('.main-card').style.display = 'flex';
      const selectedGroups = Array.from(document.querySelectorAll('#cb-group-list input:checked')).map(el => el.value);
      recordRecentGroup(selectedGroups);
      initCanvas();
      applyRule();
    }
    function pauseLearning() {
      clearInterval(qTimerInterval); clearInterval(prepInterval); clearTimeout(autoNextTimeout);
      if (pool.length > 0 || current) {
        activeSession = { pool: [...pool], current, sCorrect, sWrong, qTimeLeft, isIntenseMode, sessionStreak };
        document.getElementById('btn-resume-learn') && (document.getElementById('btn-resume-learn').style.display = 'block');
      } else {
        activeSession = null;
        document.getElementById('btn-resume-learn') && (document.getElementById('btn-resume-learn').style.display = 'none');
      }
      isSessionActive = false;
      document.getElementById('learning-view').style.display = 'none';
      document.querySelector('.main-card').style.display = 'none';
      document.getElementById('home-view').style.display = 'flex';
      updateHomeStats();
    }
    function resumeLearning() {
      if (!activeSession) return;
      pool = [...activeSession.pool]; current = activeSession.current; sCorrect = activeSession.sCorrect; sWrong = activeSession.sWrong; qTimeLeft = activeSession.qTimeLeft; isIntenseMode = activeSession.isIntenseMode; sessionStreak = activeSession.sessionStreak;
      document.getElementById('home-view').style.display = 'none';
      document.getElementById('learning-view').style.display = 'flex';
      document.querySelector('.main-card').style.display = 'flex';
      isSessionActive = true;
      document.getElementById('mode-toggle-btn').innerText = isIntenseMode ? '激烈' : '休闲';
      document.getElementById('session-stats').innerText = `正确 ${sCorrect} | 错误 ${sWrong}`;
      updateStreakBadge();
      document.getElementById('q-text').innerText = current.q;
      document.getElementById('q-text').className = current.q.length > 12 ? 'long' : '';
      document.getElementById('q-cat').innerHTML = `<span>${current.cat || '综合'}</span>`;
      document.getElementById('ans-text').innerText = current.a || '';
      document.getElementById('ans-pop').classList.remove('active');
      initCanvas();
      if (isIntenseMode) {
        const itm = document.getElementById('intense-timer'); if (itm) itm.innerText = qTimeLeft;
        qTimerInterval = setInterval(() => {
          qTimeLeft--;
          if (itm) { itm.innerText = qTimeLeft; itm.classList.toggle('urgent', qTimeLeft <= 3 && qTimeLeft > 0); }
          if (qTimeLeft <= 0) { clearInterval(qTimerInterval); if (itm) itm.classList.remove('urgent'); handleTimeUp(); }
        }, 1000);
      }
    }

    function updateGroupSelect() {
      const groups = [...new Set(all.map(i => i.group_name || '默认分组'))];
      const container = document.getElementById('cb-group-list'); if (!container) return;
      const prev = Array.from(container.querySelectorAll('input:checked')).map(el => el.value);
      if (groups.length === 0) { container.innerHTML = '<p style="font-size:13px;color:var(--sub);padding:10px;text-align:center;">暂无本地词库</p>'; return; }
      container.innerHTML = groups.map(g => {
        const chk = (prev.length === 0) ? 'checked' : (prev.includes(g) ? 'checked' : '');
        return `<label class="cb-item"><input type="checkbox" value="${g}" ${chk} onchange="applyRule()"><div class="cb-checkmark"></div><div class="cb-label">${g}</div></label>`;
      }).join('');
    }
    function checkAllGroups(check) { document.querySelectorAll('#cb-group-list input').forEach(el => el.checked = check); applyRule(); }
    async function deleteLocalGroups() {
      const selected = Array.from(document.querySelectorAll('#cb-group-list input:checked')).map(el => el.value);
      if (selected.length === 0) return alert("请先勾选要删除的词库");
      if (!confirm(`确定要彻底删除以下 ${selected.length} 个词库吗？`)) return;
      showLoading("清理中...");
      try {
        const { error } = await db().from('dictation_items').delete().eq('user_id', currentUser.id).in('group_name', selected);
        if (error) throw error;
        sync();
      } catch (e) { showToast("删除失败：" + e.message); }
      hideLoading();
    }
    function applyRule() {
      const mv = document.getElementById('mode-val'), m = mv ? mv.value : 'all';
      const selectedGroups = Array.from(document.querySelectorAll('#cb-group-list input:checked')).map(el => el.value);
      let base = selectedGroups.length > 0 ? all.filter(i => selectedGroups.includes(i.group_name || '默认分组')) : [];
      if (useSpacedRepetition && m === 'all') {
        base = base.filter(item => {
          const s = getItemStats(item);
          if (s.consecutive_correct >= masteryThreshold && s.last_seen) {
            const days = (Date.now() - s.last_seen) / (1000 * 60 * 60 * 24);
            if (days < 1) return false;
          }
          return true;
        });
      }
      if (m === 'all') filtered = base;
      else if (m === 'wrong') filtered = wrongs;
      else if (m === 'sr_hard') filtered = base.filter(i => { const s = getItemStats(i); return s.memory_weight > 150 && s.consecutive_correct < masteryThreshold; });
      else if (m === 'sr_mastered') filtered = base.filter(i => getItemStats(i).consecutive_correct >= masteryThreshold);
      else if (m === 'poem') filtered = base.filter(i => /(诗|句)/.test(i.cat || ''));
      else if (m === 'note') filtered = base.filter(i => /(注|释|文)/.test(i.cat || ''));
      else if (m === 'word') filtered = base.filter(i => !/(诗|句|注|释|文)/.test(i.cat || ''));
      document.getElementById('count-info') && (document.getElementById('count-info').innerText = `${filtered.length}`);
      renderSRStats();
      restartSession();
    }

    function toggleAppMode() {
      isIntenseMode = !isIntenseMode;
      const mtb = document.getElementById('mode-toggle-btn');
      if (mtb) {
        if (isIntenseMode) mtb.innerText = '激烈';
        else mtb.innerText = ({ 'zh-CN': '休闲', 'en': 'Casual', 'ja': '普通', 'ko': '일반' }[currentLang] || '休闲');
      }
      document.body.classList.toggle('intense-mode', isIntenseMode);
      resetEraser();
      initCanvas();
      playBGM(true);
      restartSession();
    }
    function changeIntenseTime() { if (isIntenseMode) restartSession(); }
    function restartSession() {
      clearInterval(qTimerInterval); clearInterval(prepInterval); clearTimeout(autoNextTimeout);
      isSessionActive = false; sessionStreak = 0; updateStreakBadge();
      const itm = document.getElementById('intense-timer');
      if (itm) { itm.classList.remove('prep', 'urgent'); itm.innerText = ''; }
      document.getElementById('finish-overlay').style.display = 'none';
      const cc = document.getElementById('confetti-canvas'); if (cc) { const cCtx = cc.getContext('2d'); cCtx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
      document.getElementById('ans-pop').classList.remove('active', 'timeout-state');
      resetEraser();
      pool = [...filtered]; sCorrect = 0; sWrong = 0; updateProgress();
      if (audioInitialized) playBGM(true);
      if (isIntenseMode) startPrepCountdown();
      else {
        if (pool.length > 0) nextQ();
        else document.getElementById('q-text').innerText = "暂无题目";
      }
    }
    function startPrepCountdown() {
      let prepTime = 5;
      const timerEl = document.getElementById('intense-timer');
      if (timerEl) { timerEl.classList.add('prep'); timerEl.innerText = prepTime; }
      document.getElementById('q-text').innerText = "准备迎接...";
      document.getElementById('q-cat').innerHTML = "<span>PREPARING</span>";
      prepInterval = setInterval(() => {
        prepTime--;
        if (timerEl) timerEl.innerText = prepTime;
        if (prepTime <= 0) {
          clearInterval(prepInterval);
          if (timerEl) timerEl.classList.remove('prep');
          beginIntenseChallenge();
        }
      }, 1000);
    }
    function beginIntenseChallenge() { isSessionActive = true; sessionStartTime = Date.now(); if (pool.length > 0) nextQ(); }

    function nextQ() {
      if (!pool.length) return;
      clearBoard();
      current = weightedPick(pool);
      const qEl = document.getElementById('q-text');
      if (qEl) {
        qEl.style.opacity = '0';
        setTimeout(() => { qEl.innerText = current.q; qEl.className = current.q.length > 12 ? 'long' : ''; qEl.style.opacity = '1'; }, 120);
      }
      const catEl = document.getElementById('q-cat'), diffInfo = getDifficultyInfo(current);
      if (catEl) {
        if (diffInfo && useSpacedRepetition) catEl.innerHTML = `<span>${current.cat || '综合'}</span><span class="diff-badge">${diffInfo.label}</span>`;
        else catEl.innerHTML = `<span>${current.cat || '综合'}</span>`;
      }
      document.getElementById('ans-text').innerText = current.a || '';
      const isr = document.getElementById('item-sr-stats');
      if (useSpacedRepetition && isr) {
        const stats = getItemStats(current);
        const daysSince = stats.last_seen ? Math.floor((Date.now() - stats.last_seen) / (1000 * 60 * 60 * 24)) : null;
        isr.innerHTML = `<span class="sr-stat-chip">错 ${stats.wrong_count}</span><span class="sr-stat-chip">对 ${stats.consecutive_correct}</span><span class="sr-stat-chip">权 ${stats.memory_weight}</span>${daysSince !== null ? `<span class="sr-stat-chip">${daysSince === 0 ? '今天' : daysSince + '天前'}</span>` : '<span class="sr-stat-chip">初见</span>'}`;
      } else if (isr) isr.innerHTML = '';
      document.getElementById('ans-pop').classList.remove('active', 'timeout-state');
      if (isIntenseMode) {
        const tv = document.getElementById('time-val'); qTimeLeft = parseInt(tv ? tv.value : '8') || 8;
        const itm = document.getElementById('intense-timer'); if (itm) { itm.innerText = qTimeLeft; itm.classList.remove('urgent'); }
        clearInterval(qTimerInterval);
        qTimerInterval = setInterval(() => {
          qTimeLeft--;
          if (itm) { itm.innerText = qTimeLeft; itm.classList.toggle('urgent', qTimeLeft <= 3 && qTimeLeft > 0); }
          if (qTimeLeft <= 0) { clearInterval(qTimerInterval); if (itm) itm.classList.remove('urgent'); handleTimeUp(); }
        }, 1000);
      }
    }
    function handleTimeUp() {
      playSFX('no');
      const ap = document.getElementById('ans-pop');
      if (ap) ap.classList.add('active', 'timeout-state');
      const at = document.getElementById('ans-text');
      if (at) at.innerHTML = current.a + '<br><span style="color:var(--color-red);font-size:13px;display:block;margin-top:8px;">超时跳过</span>';
      autoNextTimeout = setTimeout(() => { if (ap) ap.classList.remove('timeout-state', 'active'); mark(false); }, 1600);
    }
    function mark(isOk) {
      recordActivity(); updateGlobalStats(isOk);
      if (isOk) {
        sCorrect++; sessionStreak++;
        if (sessionStreak > 0 && sessionStreak % 3 === 0) playSFX('streak'); else playSFX('yes');
        const mv = document.getElementById('mode-val');
        if (mv && mv.value === 'wrong') {
          wrongs = wrongs.filter(i => i.q !== current.q);
          localStorage.setItem(wrongStorageKey, JSON.stringify(wrongs));
          renderWrongs();
          document.getElementById('count-info') && (document.getElementById('count-info').innerText = `${pool.length - 1}`);
        }
      } else {
        sWrong++; sessionStreak = 0;
        if (!isIntenseMode) playSFX('no');
        if (!wrongs.find(i => i.q === current.q)) {
          wrongs.push(current);
          localStorage.setItem(wrongStorageKey, JSON.stringify(wrongs));
          renderWrongs();
        }
      }
      if (useSpacedRepetition) updateItemStats(current, isOk);
      updateStreakBadge();
      pool = pool.filter(i => i !== current);
      updateProgress();
      document.getElementById('ans-pop').classList.remove('active');
      if (pool.length === 0) {
        clearInterval(qTimerInterval);
        recordSessionResult(sCorrect, sWrong);
        showFinish(false);
      } else setTimeout(nextQ, 350);
    }
    function showFinish(isTimeout) {
      isSessionActive = false;
      document.getElementById('session-stats').innerText = `正确 ${sCorrect} | 错误 ${sWrong}`;
      const zenEl = document.getElementById('zen-quote-text'), titleEl = document.getElementById('finish-title');
      const finStar = document.getElementById('finish-star');
      const mbDiv = document.getElementById('mastery-breakdown');
      if (isIntenseMode) {
        const timeUsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const accuracy = (sCorrect + sWrong) > 0 ? Math.round((sCorrect / (sCorrect + sWrong)) * 100) : 0;
        if (titleEl) titleEl.innerText = '挑战结束';
        if (finStar) finStar.style.color = 'var(--color-red)';
        if (zenEl) { zenEl.innerText = `命中率: ${accuracy}% · 总耗时: ${timeUsed}s`; zenEl.style.fontFamily = "monospace"; }
      } else {
        if (titleEl) titleEl.innerText = '洗练完成';
        if (finStar) { finStar.style.color = 'var(--brand)'; finStar.classList.add('celebrating'); setTimeout(() => finStar.classList.remove('celebrating'), 800); }
        if (zenEl) { zenEl.innerText = "「 行到水穷处，坐看云起时。 」"; zenEl.style.fontFamily = "var(--font-cn-title)"; }
        setTimeout(fireConfetti, 200);
      }
      if (useSpacedRepetition && filtered.length > 0 && mbDiv) {
        mbDiv.style.display = 'block';
        let mastered = 0, hard = 0, learning = 0;
        filtered.forEach(item => {
          const s = getItemStats(item);
          if (s.consecutive_correct >= masteryThreshold) mastered++;
          else if (s.memory_weight > 150) hard++;
          else learning++;
        });
        const total = filtered.length;
        const bar = (val, color) => `<div class="mb-fill" style="background:${color}; width:${Math.round((val / total) * 100)}%"></div>`;
        mbDiv.innerHTML = `<div class="mb-row"><div class="mb-label">掌握</div><div class="mb-track">${bar(mastered, 'var(--color-green)')}</div><div class="mb-count">${mastered}</div></div><div class="mb-row"><div class="mb-label">学习</div><div class="mb-track">${bar(learning, '#1e88e5')}</div><div class="mb-count">${learning}</div></div><div class="mb-row"><div class="mb-label">强化</div><div class="mb-track">${bar(hard, 'var(--color-red)')}</div><div class="mb-count">${hard}</div></div>`;
      } else if (mbDiv) mbDiv.style.display = 'none';
      document.getElementById('finish-overlay').style.display = 'flex';
      renderSRStats();
    }
    function fireConfetti() {
      const canvas = document.getElementById('confetti-canvas'); if (!canvas) return;
      const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      const pieces = [], colors = ['#d15147', '#5a825a', '#ff9f0a', '#00b4d8', '#ec407a'];
      for (let i = 0; i < 90; i++) pieces.push({ x: canvas.width / 2, y: canvas.height / 2 + 80, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 1) * 18, size: Math.random() * 9 + 4, color: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 360, rotS: (Math.random() - 0.5) * 9 });
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        pieces.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.rot += p.rotS;
          if (p.y < canvas.height) active = true;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
        });
        const fov = document.getElementById('finish-overlay');
        if (active && fov && fov.style.display === 'flex') requestAnimationFrame(draw);
      }
      draw();
    }

    function playBGM(forceRestart = false) {
      const n = document.getElementById('bg-music'), i = document.getElementById('bg-music-intense');
      if (!n || !i) return; n.pause(); i.pause();
      const bt = document.getElementById('bgm-toggle');
      if (bt && bt.checked) {
        const active = isIntenseMode ? i : n;
        if (forceRestart) active.currentTime = 0;
        active.play().catch(() => { });
      }
    }
    function toggleBGM() {
      const bt = document.getElementById('bgm-toggle');
      if (bt) localStorage.setItem('bgm_enabled', bt.checked);
      playBGM();
    }

    function renderWrongs() {
      const wl = document.getElementById('wrong-list');
      if (!wl) return;
      wl.innerHTML = wrongs.length > 0 ? wrongs.map(i => `<div class="wrong-item"><div class="w-ans">${i.a}</div><div class="w-q">${i.q}</div></div>`).join('') : `<div style="color:var(--sub);text-align:center;padding:20px;font-size:13px;">暂无错题记录</div>`;
    }
    function clearWrongs() { if (confirm("清空本地错题记录？")) { wrongs = []; localStorage.setItem(wrongStorageKey, '[]'); renderWrongs(); applyRule(); } }
    function exportWrongs() {
      if (wrongs.length === 0) return showToast("错题本空空如也！");
      let content = "言叶之庭 - 个人错题本\n==========================\n\n";
      wrongs.forEach((w, i) => { content += `[${i + 1}] 类别: ${w.cat || '综合'}\n题目: ${w.q}\n答案: ${w.a}\n--------------------------\n`; });
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "我的错题本.txt"; a.click();
    }
