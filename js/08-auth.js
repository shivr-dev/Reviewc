    function switchAuthType(type) {
      authType = type;
      document.getElementById('tab-email').className = `auth-tab ${type === 'email' ? 'active' : ''}`;
      document.getElementById('tab-user').className = `auth-tab ${type === 'username' ? 'active' : ''}`;
      const aAc = document.getElementById('auth-account');
      if (aAc) aAc.placeholder = TRANSLATIONS[currentLang]?.[type === 'email' ? 'ph_email' : 'ph_invite'] || '';
      const aIv = document.getElementById('auth-invite');
      if (aIv) aIv.style.display = (type === 'username' && isRegisterMode) ? 'block' : 'none';
    }
    function toggleAuthMode() {
      isRegisterMode = !isRegisterMode;
      const t = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-CN'];
      document.getElementById('auth-toggle-btn') && (document.getElementById('auth-toggle-btn').textContent = isRegisterMode ? t.toggle_login : t.toggle_register);
      document.getElementById('auth-submit-btn') && (document.getElementById('auth-submit-btn').textContent = isRegisterMode ? (currentLang === 'zh-CN' ? '注 册' : currentLang === 'ja' ? '登録' : currentLang === 'ko' ? '회원가입' : 'Register') : t.btn_login);
      document.getElementById('recaptcha-container') && (document.getElementById('recaptcha-container').style.display = isRegisterMode ? 'block' : 'none');
      switchAuthType(authType);
    }
    async function handleAuth() {
      let account = document.getElementById('auth-account').value.trim();
      const pwd = document.getElementById('auth-pwd').value;
      const inviteCode = document.getElementById('auth-invite').value.trim();
      if (!account || !pwd) return showToast("请填写账号和密码");
      if (isRegisterMode && account.toLowerCase() !== 'admin') {
        const recaptchaResponse = window.grecaptcha ? grecaptcha.getResponse() : null;
        if (!recaptchaResponse) { showToast("请先完成验证"); return; }
      }
      showLoading("身份核实中...");
      if (account.toLowerCase() === 'admin') {
        account = 'admin@yanye.com'; authType = 'email';
        const { data, error } = await db().auth.signInWithPassword({ email: account, password: pwd });
        if (error) {
          const regRes = await db().auth.signUp({ email: account, password: pwd });
          if (regRes.data?.session === null) { hideLoading(); showToast("检测到创建 admin，请去后台关闭 Confirm email"); return; }
          loginSuccess(regRes.data?.user); return;
        }
        loginSuccess(data.user); return;
      }
      try {
        let finalEmail = account;
        if (authType === 'username') {
          if (!/^[a-zA-Z0-9_]+$/.test(account)) throw new Error("用户名只能包含字母、数字或下划线");
          finalEmail = account + '@yanye.local';
        }
        if (isRegisterMode) {
          if (authType === 'username') {
            if (!inviteCode) throw new Error("邀请码为必填项");
            const { data: codeData, error: codeErr } = await db().from('invitation_codes').select('*').eq('code', inviteCode).single();
            if (codeErr || !codeData || codeData.is_used) throw new Error("邀请码无效或已被使用");
          }
          const { data, error } = await db().auth.signUp({ email: finalEmail, password: pwd });
          if (error) throw error;
          if (authType === 'username') {
            await db().from('invitation_codes').update({ is_used: true, used_by: account }).eq('code', inviteCode);
            loginSuccess(data.user);
          } else if (data.session === null) {
            hideLoading(); pendingAuthEmail = finalEmail;
            document.getElementById('main-auth-card').style.display = 'none';
            document.getElementById('otp-auth-card').style.display = 'block';
          } else loginSuccess(data.user);
        } else {
          const { data, error } = await db().auth.signInWithPassword({ email: finalEmail, password: pwd });
          if (error) throw error;
          loginSuccess(data.user);
        }
      } catch (e) {
        hideLoading();
        showToast("操作失败：" + e.message);
        if (window.grecaptcha) grecaptcha.reset();
      }
    }
    async function verifyOtpCode() {
      const token = document.getElementById('auth-otp-input').value.trim();
      if (!token || token.length < 5) return showToast("请输入完整的验证码");
      showLoading("核验代码...");
      try {
        const { data, error } = await db().auth.verifyOtp({ email: pendingAuthEmail, token, type: 'signup' });
        if (error) throw error;
        loginSuccess(data.user);
      } catch (e) {
        hideLoading();
        showToast("验证失败: " + e.message);
      }
    }
    function cancelOtpMode() {
      document.getElementById('otp-auth-card').style.display = 'none';
      document.getElementById('main-auth-card').style.display = 'block';
      if (window.grecaptcha) grecaptcha.reset();
    }

    function loginSuccess(user) {
      currentUser = user;
      document.getElementById('auth-view').style.display = 'none';
      let displayEmail = user.email;
      if (displayEmail === 'admin@yanye.com') displayEmail = '管理员';
      else if (displayEmail.endsWith('@yanye.local')) displayEmail = displayEmail.replace('@yanye.local', '');
      document.getElementById('user-info-text') && (document.getElementById('user-info-text').textContent = `已连接: ${displayEmail}`);
      const ap = document.getElementById('admin-panel');
      if (user.email === 'admin@yanye.com' && ap) { ap.style.display = 'block'; fetchInviteCodesAdmin(); }
      wrongStorageKey = `wrongs_v11_${user.id}`;
      wrongs = JSON.parse(localStorage.getItem(wrongStorageKey) || '[]');
      useSpacedRepetition = localStorage.getItem('use_sr') !== 'false';
      document.getElementById('sr-toggle') && (document.getElementById('sr-toggle').checked = useSpacedRepetition);
      masteryThreshold = parseInt(localStorage.getItem('mastery_thresh') || '5');
      document.getElementById('mastery-val') && (document.getElementById('mastery-val').value = masteryThreshold);
      const mt = { '3': '3 次连续正确', '5': '5 次连续正确', '8': '8 次连续正确' };
      document.querySelector('#cw-mastery .custom-select-display') && (document.querySelector('#cw-mastery .custom-select-display').innerText = mt[masteryThreshold] || '5 次连续正确');
      loadMemoryStats();
      syncAndGoHome();
    }

    async function generateInviteCodeToDB() {
      showLoading("生成中...");
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = ''; for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      try {
        const { error } = await db().from('invitation_codes').insert({ code, created_by: currentUser.id });
        if (error) throw error;
        fetchInviteCodesAdmin();
      } catch (e) { showToast("生成失败: " + e.message); }
      hideLoading();
    }
    async function fetchInviteCodesAdmin() {
      const div = document.getElementById('admin-codes'); if (!div) return;
      div.innerHTML = "读取中...";
      try {
        const { data, error } = await db().from('invitation_codes').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        div.innerHTML = data.map(c => `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 4px;border-bottom:1px dashed var(--border);"><div><strong style="color:${c.is_used ? 'var(--sub)' : 'var(--color-green)'};letter-spacing:1px;font-size:13px;">${c.code}</strong><div style="font-size:11px;margin-top:3px;color:var(--sub);">${c.is_used ? ('已用: ' + c.used_by) : '全新可用'}</div></div><button onclick="invalidateInviteCode('${c.code}','${c.used_by || ''}')" style="background:transparent;border:1px solid var(--color-red);color:var(--color-red);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;">作废</button></div>`).join('');
      } catch (e) { div.innerHTML = "读取失败: " + e.message; }
    }
    async function invalidateInviteCode(code, usedBy) {
      if (!confirm(`确定要作废该邀请码并处理关联用户吗？`)) return;
      showLoading("处理中...");
      try {
        const { error } = await db().rpc('admin_delete_invite_and_user', { target_code: code, target_username: usedBy });
        if (error) throw error;
        showToast("执行成功", "success");
        fetchInviteCodesAdmin();
      } catch (e) { showToast("操作失败: " + e.message); }
      hideLoading();
    }
    async function logoutAccount() {
      showLoading("切断...");
      try {
        await db().auth.signOut();
        for (let key in localStorage) if (key.startsWith('sb-')) localStorage.removeItem(key);
        window.location.reload();
      } catch { window.location.reload(); }
    }
    async function deleteAccount() {
      if (!confirm("确定要注销账号并永久销毁所有数据吗？")) return;
      if (prompt("输入【确认注销】：") !== "确认注销") return showToast("已中止。");
      showLoading("销毁中...");
      try {
        const { error } = await db().rpc('delete_user');
        if (error) throw error;
        showToast("数据已抹除", "success");
        await logoutAccount();
      } catch (e) {
        showToast("注销失败：" + e.message);
        hideLoading();
      }
    }

    async function syncAndGoHome() {
      showLoading("同步词库数据...");
      const { data } = await db().from('dictation_items').select('*');
      all = data || [];
      updateGroupSelect(); hideLoading();
      document.getElementById('learning-view').style.display = 'none';
      document.getElementById('home-view').style.display = 'flex';
      document.getElementById('home-view').classList.add('view-enter');
      updateHomeStats();
      document.getElementById('btn-resume-learn') && (document.getElementById('btn-resume-learn').style.display = activeSession ? 'block' : 'none');
    }
    async function sync() {
      showLoading("更新数据...");
      const { data } = await db().from('dictation_items').select('*');
      all = data || [];
      updateGroupSelect();
      updateHomeStats();
      hideLoading();
    }
