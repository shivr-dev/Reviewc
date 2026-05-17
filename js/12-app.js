    window.onload = async () => {
      setLang(currentLang);
      const sb = initSupabase();
      if (!sb) {
        hideLoading();
        document.getElementById('auth-view').style.display = 'flex';
        showToast('数据库 SDK 加载失败，请刷新或检查网络');
        return;
      }
      const { data: { session } } = await sb.auth.getSession();
      if (session && session.user) loginSuccess(session.user);
      else { hideLoading(); document.getElementById('auth-view').style.display = 'flex'; }

      allowDblClickClear = localStorage.getItem('allow_dblclick') !== 'false';
      document.getElementById('dblclick-toggle') && (document.getElementById('dblclick-toggle').checked = allowDblClickClear);

      document.getElementById('bgm-toggle') && (document.getElementById('bgm-toggle').checked = localStorage.getItem('bgm_enabled') !== 'false');
      document.body.addEventListener('click', () => { if (!audioInitialized) { playBGM(); audioInitialized = true; } }, { once: true });

      document.addEventListener('click', e => {
        if (!e.target.closest('.custom-select-wrapper')) {
          document.querySelectorAll('.custom-select-dropdown').forEach(el => el.classList.remove('open'));
          document.querySelectorAll('.custom-select-display').forEach(el => el.classList.remove('open'));
        }
      });

      document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const pop = document.getElementById('ans-pop');
        if (pop) {
          if (e.code === 'Space' && !pop.classList.contains('active')) { e.preventDefault(); showAns(true); }
          else if (e.key.toLowerCase() === 'y' && pop.classList.contains('active')) mark(true);
          else if (e.key.toLowerCase() === 'n' && pop.classList.contains('active')) mark(false);
          else if (e.code === 'ArrowRight') skipQ();
          else if (e.code === 'Escape') { closeAllPanels(); showAns(false); }
        }
      });
    };
