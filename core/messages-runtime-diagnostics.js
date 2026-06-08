/* ===== IMMATCONNECT OBD — MESSAGES RUNTIME DIAGNOSTICS ===== */
(function(){
  'use strict';

  if(window.ImmatMessagesRuntimeDiagnostics) return;

  const $ = id => document.getElementById(id);

  function safeJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function textValue(id){
    const el = $(id);
    if(!el) return null;
    return typeof el.value === 'string' ? el.value : (el.textContent || null);
  }

  function elState(id){
    const el = $(id);
    if(!el) return { exists:false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    let topElement = '-';
    try{
      const x = r.left + Math.min(Math.max(r.width / 2, 1), Math.max(r.width - 1, 1));
      const y = r.top + Math.min(Math.max(r.height / 2, 1), Math.max(r.height - 1, 1));
      const top = document.elementFromPoint(x, y);
      topElement = top ? (top.tagName.toLowerCase() + (top.id ? '#'+top.id : '') + (top.className ? '.'+String(top.className).trim().replace(/\s+/g,'.') : '')) : '-';
    }catch(e){}
    return {
      exists:true,
      display:cs.display,
      visibility:cs.visibility,
      pointerEvents:cs.pointerEvents,
      zIndex:cs.zIndex,
      rect:{ x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) },
      topElement
    };
  }

  function listRows(){
    try{
      return Array.from(document.querySelectorAll('.ic-mail-row[data-plate]')).slice(0, 30).map(row => ({
        plate: row.dataset.plate || null,
        unread: row.classList.contains('unread'),
        active: row.classList.contains('active'),
        preview: row.querySelector('.ic-preview')?.textContent || '',
        time: row.querySelector('.ic-row-time')?.textContent || ''
      }));
    }catch(e){ return []; }
  }

  function bubbleSummary(){
    try{
      return Array.from(document.querySelectorAll('#icThreadBody .ic-bubble')).slice(-30).map(b => ({
        kind: b.classList.contains('sent') ? 'sent' : b.classList.contains('recv') ? 'recv' : b.className,
        text: b.querySelector('.ic-bubble-text')?.textContent || '',
        time: b.querySelector('.ic-time')?.textContent || ''
      }));
    }catch(e){ return []; }
  }

  function run(){
    const deleted = safeJson('ic_deleted_msgs', []);
    const archived = safeJson('ic_archived', []);
    const favorites = safeJson('ic_favorites', []);
    const trust = safeJson('ic_trust', {});
    const contextTrust = safeJson('ic_context_trust', {});
    const spamLog = safeJson('ic_spam_log', {});

    const im = window.ImmatMessages || null;
    const unreadStored = localStorage.getItem('ic_unread_msg_count');

    return {
      at: Date.now(),
      build:'messages-runtime-diagnostics-v1',
      module:{
        hasImmatMessages: !!im,
        hasRefresh: typeof im?.refresh === 'function',
        hasSendToPlate: typeof im?.sendToPlate === 'function',
        hasSendNew: typeof im?.sendNew === 'function',
        hasReply: typeof im?.reply === 'function',
        hasOpenThread: typeof im?.openThread === 'function',
        hasDeleteMessage: typeof im?.deleteMessage === 'function',
        hasDeleteThread: typeof im?.deleteThread === 'function',
        hasDeleteAllMessages: typeof im?.deleteAllMessages === 'function',
        hasRenderCallLog: typeof im?.renderCallLog === 'function'
      },
      storage:{
        deletedMessagesCount: Array.isArray(deleted) ? deleted.length : null,
        deletedMessagesSample: Array.isArray(deleted) ? deleted.slice(-20) : [],
        archivedCount: Array.isArray(archived) ? archived.length : null,
        archivedSample: Array.isArray(archived) ? archived.slice(-20) : [],
        favoritesCount: Array.isArray(favorites) ? favorites.length : null,
        favoritesSample: Array.isArray(favorites) ? favorites.slice(-20) : [],
        trustCount: trust && typeof trust === 'object' ? Object.keys(trust).length : null,
        contextTrustCount: contextTrust && typeof contextTrust === 'object' ? Object.keys(contextTrust).length : null,
        spamLogCount: spamLog && typeof spamLog === 'object' ? Object.keys(spamLog).length : null,
        unreadStored
      },
      dom:{
        icMessagesPro: elState('icMessagesPro'),
        icMsgList: elState('icMsgList'),
        icThread: elState('icThread'),
        icThreadBody: elState('icThreadBody'),
        icComposePanel: elState('icComposePanel'),
        icCallLog: elState('icCallLog'),
        icSheetBackdrop: elState('icSheetBackdrop'),
        icBottomSheet: elState('icBottomSheet'),
        icComposePlate: elState('icComposePlate'),
        icComposeText: elState('icComposeText'),
        icReplyText: elState('icReplyText')
      },
      values:{
        composePlate: textValue('icComposePlate'),
        composeTextLength: (textValue('icComposeText') || '').length,
        replyTextLength: (textValue('icReplyText') || '').length,
        threadTitle: $('icThreadTitle')?.textContent || null,
        threadSub: $('icThreadSub')?.textContent || null,
        contextCard: $('icContextCard')?.textContent || null
      },
      visible:{
        conversationRowsCount: document.querySelectorAll('.ic-mail-row[data-plate]').length,
        rows:listRows(),
        threadBubblesCount: document.querySelectorAll('#icThreadBody .ic-bubble').length,
        recentBubbles:bubbleSummary(),
        swipeOpenCount: document.querySelectorAll('.ic-swipe-wrap[data-swipe-open="1"]').length
      }
    };
  }

  window.ImmatMessagesRuntimeDiagnostics = { run };
})();
