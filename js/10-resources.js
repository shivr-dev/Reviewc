    function toggleResourceCenter(show) { if (show) openPanel('resource-center'); else closeAllPanels(); }
    function toggleUploadModal(show) { if (show) openPanel('upload-modal'); else openPanel('resource-center'); }
    function handleLocalImage(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
          let w = img.width, h = img.height;
          if (w > h && w > 500) { h *= 500 / w; w = 500; }
          else if (h > 500) { w *= 500 / h; h = 500; }
          canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h);
          document.getElementById('rc-up-cover-base64') && (document.getElementById('rc-up-cover-base64').value = canvas.toDataURL('image/jpeg', 0.8));
          document.getElementById('rc-up-file-label') && (document.getElementById('rc-up-file-label').innerText = `已选择: ${file.name}`);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    async function fetchResources() {
      const listDiv = document.getElementById('rc-list'); if (!listDiv) return;
      listDiv.innerHTML = '<p style="color:var(--sub);font-size:14px;grid-column:1/-1;text-align:center;">读取中...</p>';
      try {
        const { data, error } = await db().from('resource_center').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        resourceData = data || [];
        renderResources();
      } catch (e) {
        listDiv.innerHTML = `<p style="color:var(--color-red);font-size:14px;grid-column:1/-1;text-align:center;">连接失败: ${e.message}</p>`;
      }
    }
    function renderResources() {
      const listDiv = document.getElementById('rc-list'); if (!listDiv) return;
      if (resourceData.length === 0) { listDiv.innerHTML = '<p style="color:var(--sub);font-size:14px;grid-column:1/-1;text-align:center;">暂无资源分享</p>'; return; }
      const isAdmin = currentUser && currentUser.email === 'admin@yanye.com';
      const localGroups = [...new Set(all.map(i => i.group_name || '默认分组'))];
      listDiv.innerHTML = resourceData.map(res => {
        const canDelete = currentUser && (res.uploader_id === currentUser.id || isAdmin);
        let displayAuthor = res.uploader_email.endsWith('@yanye.local') ? res.uploader_email.replace('@yanye.local', '') : res.uploader_email.split('@')[0];
        if (res.uploader_email === 'admin@yanye.com') displayAuthor = '官方';
        const coverHtml = (res.cover_url && res.cover_url.length > 20) ? `<img src="${res.cover_url}" class="rc-cover" onerror="this.outerHTML='<div class=\\'rc-cover-emoji\\'>DOC</div>'">` : `<div class="rc-cover-emoji">DOC</div>`;
        const isDownloaded = localGroups.includes(res.title);
        const dlBtn = isDownloaded ? `<button class="btn btn-outline" style="flex:1;padding:7px;font-size:12px;" disabled>已下载</button>` : `<button class="btn btn-primary" style="flex:1;padding:7px;font-size:12px;" onclick="downloadResource('${res.id}')">下载</button>`;
        return `<div class="rc-item">${coverHtml}<div class="rc-info"><h4 class="rc-title">${res.title}</h4><div class="rc-author">${displayAuthor}</div><p class="rc-desc">${res.description || '暂无简介'}</p></div><div class="rc-actions">${dlBtn}${canDelete ? `<button class="btn btn-outline" style="color:var(--color-red);border-color:var(--color-red);padding:7px;" onclick="deleteResource('${res.id}')">删除</button>` : ''}</div></div>`;
      }).join('');
    }
    async function submitResource() {
      const titEl = document.getElementById('rc-up-title'), desEl = document.getElementById('rc-up-desc'), covEl = document.getElementById('rc-up-cover-base64'), jsnEl = document.getElementById('rc-up-json');
      if (!titEl || !jsnEl) return;
      const title = titEl.value.trim(), desc = desEl ? desEl.value.trim() : "", cover = covEl ? covEl.value : "", jsonText = jsnEl.value.trim();
      if (!title || !jsonText) return showToast("标题和 JSON 数据为必填项！");
      let jsonData = []; try { jsonData = JSON.parse(jsonText); if (!Array.isArray(jsonData)) throw new Error("JSON 必须是数组格式"); } catch (e) { return showToast("JSON 格式有误: " + e.message); }
      showLoading("上传中...");
      try {
        const { error } = await db().from('resource_center').insert({ title, description: desc, cover_url: cover, json_data: jsonData, uploader_id: currentUser.id, uploader_email: currentUser.email });
        if (error) throw error;
        showToast("发布成功", "success");
        titEl.value = ''; if (desEl) desEl.value = ''; jsnEl.value = '';
        openPanel('resource-center'); fetchResources();
      } catch (e) { showToast("发布失败: " + e.message); }
      hideLoading();
    }
    async function downloadResource(id) {
      const res = resourceData.find(r => r.id === id); if (!res) return;
      const groupName = prompt(`将【${res.title}】下载到本地分组：`, res.title); if (!groupName) return;
      showLoading("合并中...");
      try {
        const dataToInsert = res.json_data.map(item => { const ci = { ...item, group_name: groupName, user_id: currentUser.id }; delete ci.id; delete ci.created_at; return ci; });
        const { error } = await db().from('dictation_items').insert(dataToInsert);
        if (error) throw error;
        showToast(`成功导入 ${dataToInsert.length} 个词条！`, "success");
        await sync(); renderResources();
      } catch (e) { showToast("下载失败：" + e.message); }
      hideLoading();
    }
    async function deleteResource(id) {
      if (!confirm("确定要删除这个分享吗？")) return;
      showLoading("删除中...");
      try {
        const { error } = await db().from('resource_center').delete().eq('id', id);
        if (error) throw error;
        fetchResources();
      } catch (e) { showToast("删除失败: " + e.message); }
      hideLoading();
    }

    async function upload(mode) {
      const jip = document.getElementById('jsonInput'), ug = document.getElementById('upload-group');
      if (!jip || !ug) return;
      const input = jip.value, groupName = ug.value || '默认分组';
      if (!input) return showToast("请粘贴 JSON");
      try {
        const data = JSON.parse(input).map(item => ({ ...item, group_name: groupName, user_id: currentUser.id }));
        if (mode === 'cover') {
          if (!confirm("确定清空云端该分组所有词条并覆盖？")) return;
          await db().from('dictation_items').delete().eq('user_id', currentUser.id).eq('group_name', groupName);
        }
        showLoading("数据写入中...");
        await db().from('dictation_items').insert(data);
        showToast("同步成功", "success");
        jip.value = ''; closeAllPanels(); sync();
      } catch (e) {
        hideLoading(); showToast("失败: " + e.message);
      }
    }
