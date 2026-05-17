    function loadMemoryStats() {
      if (!currentUser) return;
      memoryStats = JSON.parse(localStorage.getItem(`mem_stats_${currentUser.id}`) || '{}');
    }
    function saveMemoryStats() {
      if (!currentUser) return;
      localStorage.setItem(`mem_stats_${currentUser.id}`, JSON.stringify(memoryStats));
    }
    function getItemKey(item) {
      return item.id ? String(item.id) : ('q_' + (item.q + item.a).split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0) | 0, 0));
    }
    function getItemStats(item) {
      const key = getItemKey(item);
      if (!memoryStats[key]) memoryStats[key] = { wrong_count: 0, consecutive_correct: 0, memory_weight: WEIGHT_DEFAULT, last_seen: null };
      return memoryStats[key];
    }
    function updateItemStats(item, isCorrect) {
      const stats = getItemStats(item);
      if (isCorrect) {
        stats.consecutive_correct++;
        stats.memory_weight = Math.max(WEIGHT_MIN, Math.round(stats.memory_weight * Math.max(0.4, 0.7 - stats.consecutive_correct * 0.04)));
      } else {
        stats.consecutive_correct = 0;
        stats.wrong_count++;
        stats.memory_weight = Math.min(WEIGHT_MAX, Math.round(stats.memory_weight * (1.6 + Math.min(stats.wrong_count, 5) * 0.08) + 60));
      }
      stats.last_seen = Date.now();
      memoryStats[getItemKey(item)] = stats;
      saveMemoryStats();
    }
    function getEffectiveWeight(item) {
      const stats = getItemStats(item);
      let w = stats.memory_weight;
      let daysSince = 0;
      if (stats.last_seen) {
        daysSince = (Date.now() - stats.last_seen) / (1000 * 60 * 60 * 24);
        if (daysSince > REVIEW_BOOST_DAYS) w = Math.min(WEIGHT_MAX, w + Math.floor(daysSince * 15));
      }
      if (stats.consecutive_correct >= masteryThreshold) {
        return (daysSince >= 1) ? Math.min(WEIGHT_DEFAULT, WEIGHT_MIN + Math.floor(daysSince * 8)) : 0;
      }
      return w;
    }
    function weightedPick(items) {
      if (!useSpacedRepetition || items.length === 0) return items[Math.floor(Math.random() * items.length)];
      let valid = items.filter(i => getEffectiveWeight(i) > 0);
      if (valid.length === 0) valid = items;
      const weights = valid.map(i => getEffectiveWeight(i));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < valid.length; i++) { r -= weights[i]; if (r <= 0) return valid[i]; }
      return valid[valid.length - 1];
    }
    function getDifficultyInfo(item) {
      const stats = getItemStats(item), w = stats.memory_weight;
      if (stats.consecutive_correct >= masteryThreshold) return { label: '已掌握' };
      if (w <= 30) return { label: '熟悉' };
      if (w <= 120) return { label: '学习中' };
      if (stats.wrong_count === 0 && stats.consecutive_correct === 0) return { label: '初见' };
      return { label: '需强化' };
    }
    function renderSRStats() {
      if (!useSpacedRepetition) return;
      let mastered = 0, hard = 0, learning = 0;
      filtered.forEach(item => {
        const s = getItemStats(item);
        if (s.consecutive_correct >= masteryThreshold) mastered++;
        else if (s.memory_weight > 150) hard++;
        else learning++;
      });
      const pct = filtered.length > 0 ? Math.round((mastered / filtered.length) * 100) : 0;
      document.getElementById('sr-count-mastered') && (document.getElementById('sr-count-mastered').innerText = mastered);
      document.getElementById('sr-count-learning') && (document.getElementById('sr-count-learning').innerText = learning);
      document.getElementById('sr-count-hard') && (document.getElementById('sr-count-hard').innerText = hard);
      const mb = document.getElementById('mastery-bar'); if (mb) mb.style.width = pct + '%';
    }
    function updateMasteryThresh() {
      masteryThreshold = parseInt(document.getElementById('mastery-val').value) || 5;
      localStorage.setItem('mastery_thresh', masteryThreshold);
      renderSRStats();
    }
    function toggleSR() {
      useSpacedRepetition = document.getElementById('sr-toggle').checked;
      localStorage.setItem('use_sr', useSpacedRepetition);
      renderSRStats();
    }
    function resetAllSRStats() {
      if (!confirm('确定要清空记忆数据？')) return;
      memoryStats = {};
      saveMemoryStats();
      renderSRStats();
      showToast('数据已归零。', 'success');
    }
