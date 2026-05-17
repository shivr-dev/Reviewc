    function setLang(lang) {
      currentLang = lang;
      localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
      document.body.dataset.lang = lang;
      const t = TRANSLATIONS[lang] || TRANSLATIONS['zh-CN'];

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) el.textContent = t[key];
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.dataset.i18nPh;
        if (t[key]) el.placeholder = t[key];
      });

      const aTitle = document.getElementById('auth-title');
      if (aTitle) aTitle.textContent = t.app_name;

      const hw = document.querySelector('.welcome h2');
      if (hw) {
        const uname = document.getElementById('home-username');
        const name = uname ? uname.textContent : 'Learner';
        const map = {
          'zh-CN': `欢迎回来，<span id="home-username">${name}</span>`,
          'en': `Welcome back, <span id="home-username">${name}</span>`,
          'ja': `おかえりなさい、<span id="home-username">${name}</span>`,
          'ko': `다시 오셨네요, <span id="home-username">${name}</span>`
        };
        hw.innerHTML = map[lang] || map['zh-CN'];
      }

      const atb = document.getElementById('auth-toggle-btn');
      if (atb) atb.textContent = isRegisterMode ? t.toggle_login : t.toggle_register;

      const asb = document.getElementById('auth-submit-btn');
      if (asb) asb.textContent = isRegisterMode ? (lang === 'zh-CN' ? '注 册' : lang === 'ja' ? '登録' : lang === 'ko' ? '회원가입' : 'Register') : t.btn_login;

      const mtb = document.getElementById('mode-toggle-btn');
      if (mtb && !isIntenseMode) {
        mtb.textContent = lang === 'zh-CN' ? '休闲' : lang === 'en' ? 'Casual' : lang === 'ja' ? '普通' : '일반';
      }

      document.querySelectorAll('.lang-btn').forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        btn.classList.toggle('active', onclick && onclick.includes(`'${lang}'`));
      });

      renderAccuracyCurve();
      updateHomeStats();
    }
    function openPanel(id) {
      ALL_PANELS.forEach(p => {
        const el = document.getElementById(p);
        if (el && el.id !== id) el.classList.remove('open');
      });
      const target = document.getElementById(id);
      if (target) target.classList.add('open');
      document.getElementById('panel-backdrop')?.classList.add('active');

      if (id === 'setup-panel') {
        const sa = document.getElementById('setup-anchor');
        const dp = document.getElementById('dynamic-controls-pool');
        if (sa && dp) { sa.appendChild(dp); dp.style.display = 'block'; }
      } else if (id === 'settings') {
        const sa = document.getElementById('settings-anchor');
        const dp = document.getElementById('dynamic-controls-pool');
        if (sa && dp) { sa.appendChild(dp); dp.style.display = 'block'; }
        renderSRStats();
      }

      if (id === 'wrong-sidebar') renderWrongs();
      if (id === 'resource-center') fetchResources();
    }
    function closeAllPanels() {
      ALL_PANELS.forEach(p => document.getElementById(p)?.classList.remove('open'));
      document.getElementById('panel-backdrop')?.classList.remove('active');
    }

    function showToast(msg, type = 'error') {
      let c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 300); }, 3000);
    }
    window.addEventListener('error', e => { if (e.message) showToast('系统异常: ' + e.message); });
    window.addEventListener('unhandledrejection', e => { if (e.reason) showToast('网络异常: ' + (e.reason.message || e.reason)); });
    function showLoading(text = '载入中…') {
      document.getElementById('loader-text') && (document.getElementById('loader-text').textContent = text);
      const gl = document.getElementById('global-loader');
      if (gl) { gl.style.display = 'flex'; gl.style.opacity = '1'; }
    }
    function hideLoading() {
      const gl = document.getElementById('global-loader');
      if (gl) { gl.style.opacity = '0'; setTimeout(() => gl.style.display = 'none', 300); }
    }
    function toggleCustomSelect(id) {
      const drop = document.getElementById(id); if (!drop) return;
      const display = drop.previousElementSibling, isOpen = drop.classList.contains('open');
      document.querySelectorAll('.custom-select-dropdown').forEach(el => el.classList.remove('open'));
      document.querySelectorAll('.custom-select-display').forEach(el => el.classList.remove('open'));
      if (!isOpen) { drop.classList.add('open'); display.classList.add('open'); }
    }
    function selectOption(wrapperId, val, text, callback) {
      const wrapper = document.getElementById(wrapperId); if (!wrapper) return;
      const disp = wrapper.querySelector('.custom-select-display'); if (disp) disp.innerText = text;
      const hid = wrapper.querySelector('input[type="hidden"]'); if (hid) hid.value = val;
      const dropdown = wrapper.querySelector('.custom-select-dropdown');
      if (dropdown) {
        dropdown.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
        if (window.event && window.event.target) window.event.target.classList.add('selected');
        dropdown.classList.remove('open');
      }
      if (disp) disp.classList.remove('open');
      if (callback) callback();
    }
