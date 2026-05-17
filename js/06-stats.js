    function updateStreakBadge() {
      const badge = document.getElementById('streak-badge'); if (!badge) return;
      if (sessionStreak >= 3) { badge.innerText = `HOT ${sessionStreak}`; badge.className = 'hot'; }
      else { badge.innerText = sessionStreak > 0 ? `${sessionStreak}` : '–'; badge.className = ''; }
    }

    function getSessionHistory() {
      if (!currentUser) return [];
      return JSON.parse(localStorage.getItem(`session_history_${currentUser.id}`) || '[]');
    }
    function recordSessionResult(correct, wrong) {
      if (!currentUser) return;
      const hist = getSessionHistory();
      const today = new Date().toLocaleDateString('en-CA');
      const existing = hist.find(h => h.date === today);
      if (existing) { existing.correct += correct; existing.wrong += wrong; }
      else { hist.push({ date: today, correct, wrong }); }
      if (hist.length > 30) hist.shift();
      localStorage.setItem(`session_history_${currentUser.id}`, JSON.stringify(hist));
    }
    function renderAccuracyCurve() {
      const svg = document.getElementById('accuracy-chart-svg');
      if (!svg) return;
      const hist = getSessionHistory();
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toLocaleDateString('en-CA');
        const found = hist.find(h => h.date === ds);
        days.push({ date: ds, correct: found ? found.correct : 0, wrong: found ? found.wrong : 0 });
      }
      const hasData = days.some(d => d.correct + d.wrong > 0);
      if (!hasData) {
        svg.innerHTML = `<text x="170" y="40" text-anchor="middle" fill="var(--sub-light)" font-size="12" font-family="var(--font-body)">暂无数据</text>`;
        return;
      }
      const W = 340, H = 70, pad = 10;
      const pts_c = [], pts_w = [];
      days.forEach((d, i) => {
        const x = pad + (i / 13) * (W - pad * 2);
        const total = d.correct + d.wrong;
        const cy = total > 0 ? H - pad - ((d.correct / total) * (H - pad * 2)) : H - pad;
        const wy = total > 0 ? H - pad - ((d.wrong / total) * (H - pad * 2)) : H - pad;
        pts_c.push(`${x},${cy}`);
        pts_w.push(`${x},${wy}`);
      });
      const fillC = `M${pts_c[0]} L${pts_c.join(' L')} L${pad + (W - pad * 2)},${H - pad} L${pad},${H - pad} Z`;
      const fillW = `M${pts_w[0]} L${pts_w.join(' L')} L${pad + (W - pad * 2)},${H - pad} L${pad},${H - pad} Z`;

      svg.innerHTML = `
        <defs>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-green)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--color-green)" stop-opacity="0.02"/>
          </linearGradient>
          <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-red)" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="var(--color-red)" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        <path d="${fillC}" fill="url(#gc)" />
        <path d="${fillW}" fill="url(#gw)" />
        <polyline points="${pts_c.join(' ')}" fill="none" stroke="var(--color-green)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        <polyline points="${pts_w.join(' ')}" fill="none" stroke="var(--color-red)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        ${days.map((d, i) => {
          if (d.correct + d.wrong === 0) return '';
          const x = pad + (i / 13) * (W - pad * 2);
          const total = d.correct + d.wrong;
          const cy = H - pad - ((d.correct / total) * (H - pad * 2));
          return `<circle cx="${x}" cy="${cy}" r="2.5" fill="var(--color-green)"/>`;
        }).join('')}
      `;
    }

    function recordActivity() {
      if (!currentUser) return;
      const today = new Date().toLocaleDateString('en-CA');
      let dates = JSON.parse(localStorage.getItem(`study_dates_${currentUser.id}`) || '[]');
      if (!dates.includes(today)) {
        dates.push(today);
        localStorage.setItem(`study_dates_${currentUser.id}`, JSON.stringify(dates));
      }
    }
    function updateGlobalStats(isOk) {
      if (!currentUser) return;
      let gs = JSON.parse(localStorage.getItem(`global_stats_${currentUser.id}`) || '{"correct":0,"wrong":0}');
      gs.correct += isOk ? 1 : 0;
      gs.wrong += isOk ? 0 : 1;
      localStorage.setItem(`global_stats_${currentUser.id}`, JSON.stringify(gs));
    }
    function getConsecutiveDays() {
      if (!currentUser) return 0;
      let dates = JSON.parse(localStorage.getItem(`study_dates_${currentUser.id}`) || '[]');
      if (dates.length === 0) return 0;
      dates.sort((a, b) => new Date(b) - new Date(a));
      let streak = 0;
      let checkDate = new Date(); checkDate.setHours(0, 0, 0, 0);
      if (!dates.includes(checkDate.toLocaleDateString('en-CA'))) checkDate.setDate(checkDate.getDate() - 1);
      for (let i = 0; i < 365; i++) {
        if (dates.includes(checkDate.toLocaleDateString('en-CA'))) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
        else break;
      }
      return streak;
    }
    function updateHomeStats() {
      if (!currentUser) return;
      let gs = JSON.parse(localStorage.getItem(`global_stats_${currentUser.id}`) || '{"correct":0,"wrong":0}');
      let acc = (gs.correct + gs.wrong) > 0 ? Math.round((gs.correct / (gs.correct + gs.wrong)) * 100) : 0;
      document.getElementById('stat-acc') && (document.getElementById('stat-acc').innerText = acc + '%');
      document.getElementById('stat-total') && (document.getElementById('stat-total').innerText = all.length);
      document.getElementById('stat-streak') && (document.getElementById('stat-streak').innerText = getConsecutiveDays());

      const container = document.getElementById('home-calendar');
      if (container) {
        const dates = JSON.parse(localStorage.getItem(`study_dates_${currentUser.id}`) || '[]');
        let html = '';
        for (let i = 13; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          html += `<span class="dot ${dates.includes(d.toLocaleDateString('en-CA')) ? 'active' : ''}"></span>`;
        }
        container.innerHTML = html;
      }

      const recentBox = document.getElementById('recent-groups-list');
      if (recentBox) {
        const recent = JSON.parse(localStorage.getItem(`recent_groups_${currentUser.id}`) || '[]');
        if (recent.length === 0) recentBox.innerHTML = `<div class="recent-item" style="color:var(--sub-light); text-align:center; cursor:default;">暂无记录</div>`;
        else recentBox.innerHTML = recent.slice(0, 3).map(r => `<div class="recent-item" onclick="quickStart('${r}')">${r}</div>`).join('');
      }

      let displayName = currentUser.email;
      if (displayName === 'admin@yanye.com') displayName = '管理员';
      else if (displayName.endsWith('@yanye.local')) displayName = displayName.replace('@yanye.local', '');
      else displayName = displayName.split('@')[0];
      document.getElementById('home-username') && (document.getElementById('home-username').innerText = displayName);

      renderAccuracyCurve();
    }
    function recordRecentGroup(groupNames) {
      if (!currentUser || !groupNames || groupNames.length === 0) return;
      const groupStr = groupNames.join(' + ');
      let recent = JSON.parse(localStorage.getItem(`recent_groups_${currentUser.id}`) || '[]');
      recent = recent.filter(r => r !== groupStr);
      recent.unshift(groupStr);
      if (recent.length > 5) recent.pop();
      localStorage.setItem(`recent_groups_${currentUser.id}`, JSON.stringify(recent));
    }
    function quickStart(groupStr) {
      const groups = groupStr.split(' + ');
      document.querySelectorAll('#cb-group-list input').forEach(cb => { cb.checked = groups.includes(cb.value); });
      applyRule(); startNewLearning();
    }
