    function showFinishPlaceholder() {}
    function toggleDblClick() { allowDblClickClear = document.getElementById('dblclick-toggle').checked; localStorage.setItem('allow_dblclick', allowDblClickClear); }
    function toggleFullScreen() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => showToast(`全屏失败: ${err.message}`));
      else if (document.exitFullscreen) document.exitFullscreen();
      closeAllPanels();
    }
