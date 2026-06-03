/**
 * Pure logic functions extracted from the Bookmarker app for testability.
 * These mirror the inline functions in index.html.
 */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const domn = (url) => {
  try { return new URL(url).hostname; } catch { return ''; }
};

const fav = (url) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ''; }
};

const validHex = (h) => /^#[0-9a-fA-F]{6}$/.test(h);

function adj(hex, d) {
  let r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
  const c = (x) => Math.max(0, Math.min(255, x + d)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function allTags(bookmarks) {
  const s = new Set();
  bookmarks.forEach((b) => (b.tags || []).forEach((t) => s.add(t)));
  return [...s].sort();
}

const childFolders = (pid, folders) => folders.filter((f) => f.parentId === (pid || null));

function belowIds(fid, folders) {
  let ids = [];
  childFolders(fid, folders).forEach((c) => {
    ids.push(c.id);
    ids = ids.concat(belowIds(c.id, folders));
  });
  return ids;
}

function cntBelow(fid, folders, bookmarks) {
  const ids = [fid, ...belowIds(fid, folders)];
  return bookmarks.filter((b) => ids.includes(b.folder)).length;
}

function getFiltered(bookmarks, folders, { view, activeTag, sortVal, searchQuery }) {
  const allBelow = (id) => {
    let ids = [id];
    childFolders(id, folders).forEach((c) => (ids = ids.concat(allBelow(c.id))));
    return ids;
  };
  let list = bookmarks.filter((b) => {
    if (view === 'recent') return Date.now() - b.added < 604800000;
    if (view === 'unfiled') return !b.folder;
    if (view.startsWith('folder:')) return allBelow(view.slice(7)).includes(b.folder);
    return true;
  });
  if (activeTag) list = list.filter((b) => (b.tags || []).includes(activeTag));
  const q = (searchQuery || '').toLowerCase().trim();
  if (q) {
    list = list.filter((b) =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.url || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q) ||
      (b.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }
  return list.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (sortVal === 'newest') return b.added - a.added;
    if (sortVal === 'oldest') return a.added - b.added;
    if (sortVal === 'az') return (a.title || '').localeCompare(b.title || '');
    if (sortVal === 'za') return (b.title || '').localeCompare(a.title || '');
    return 0;
  });
}

function parseBookmarkHTML(htmlString, existingBookmarks, existingFolders, uidFn) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(htmlString);
  const doc = dom.window.document;

  const bookmarks = [...existingBookmarks];
  const folders = [...existingFolders];
  let imported = 0, skipped = 0, refiled = 0;
  const fidMap = {};

  function ensureF(name, pid) {
    const key = (pid || '') + '/' + name;
    if (fidMap[key]) return fidMap[key];
    let ex = folders.find((f) => f.name === name && f.parentId === (pid || null));
    if (!ex) { ex = { id: uidFn(), name, parentId: pid || null }; folders.push(ex); }
    return (fidMap[key] = ex.id);
  }

  function walk(dl, pFid) {
    if (!dl) return;
    Array.from(dl.children).forEach((node) => {
      if (node.tagName !== 'DT') return;
      const h3 = node.querySelector(':scope > H3');
      const a = node.querySelector(':scope > A');
      const sub = node.querySelector(':scope > DL');
      if (h3) {
        walk(sub, ensureF(h3.textContent.trim(), pFid));
      } else if (a) {
        const url = a.getAttribute('href');
        if (!url || url.startsWith('place:') || url.startsWith('javascript:')) { skipped++; return; }
        const existing = bookmarks.find((b) => b.url === url);
        if (existing) {
          if (pFid && !existing.folder) { existing.folder = pFid; refiled++; }
          skipped++;
          return;
        }
        const addDate = a.getAttribute('add_date');
        const tags = (a.getAttribute('tags') || '').split(',').map((t) => t.trim()).filter(Boolean);
        bookmarks.push({
          id: uidFn(),
          url,
          title: a.textContent.trim() || domn(url),
          folder: pFid || null,
          tags,
          notes: '',
          added: addDate ? parseInt(addDate) * 1000 : Date.now(),
        });
        imported++;
      }
    });
  }

  const top = doc.querySelector('DL');
  if (top) walk(top, null);

  return { bookmarks, folders, imported, skipped, refiled, folderCount: Object.keys(fidMap).length };
}

function buildExportHTML(bookmarks, folders) {
  function buildDL(pid, indent) {
    const pad = ' '.repeat(indent);
    let html = '';
    childFolders(pid, folders).forEach((f) => {
      html += `${pad}<DT><H3>${f.name}</H3>\n${pad}<DL><p>\n`;
      html += buildDL(f.id, indent + 4);
      bookmarks
        .filter((b) => b.folder === f.id)
        .forEach((b) => {
          html += `${pad}    <DT><A HREF="${b.url}" ADD_DATE="${Math.floor(b.added / 1000)}"${b.tags?.length ? ' TAGS="' + b.tags.join(',') + '"' : ''}>${b.title}</A>\n`;
        });
      html += `${pad}</DL><p>\n`;
    });
    return html;
  }
  let body = buildDL(null, 4);
  bookmarks
    .filter((b) => !b.folder)
    .forEach((b) => {
      body += `    <DT><A HREF="${b.url}" ADD_DATE="${Math.floor(b.added / 1000)}"${b.tags?.length ? ' TAGS="' + b.tags.join(',') + '"' : ''}>${b.title}</A>\n`;
    });
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${body}</DL><p>`;
}

function addBookmark(bookmarks, { url, title, folder, tags, notes }, uidFn) {
  const bk = {
    id: uidFn(),
    url,
    title: title || domn(url),
    folder: folder || null,
    tags: tags || [],
    notes: notes || '',
    added: Date.now(),
  };
  return [bk, ...bookmarks];
}

function editBookmark(bookmarks, id, updates) {
  return bookmarks.map((b) => {
    if (b.id !== id) return b;
    return {
      ...b,
      url: updates.url ?? b.url,
      title: updates.title || domn(updates.url ?? b.url),
      folder: updates.folder !== undefined ? updates.folder : b.folder,
      tags: updates.tags ?? b.tags,
      notes: updates.notes ?? b.notes,
    };
  });
}

function deleteBookmark(bookmarks, id) {
  return bookmarks.filter((b) => b.id !== id);
}

function togglePin(bookmarks, id) {
  return bookmarks.map((b) => {
    if (b.id !== id) return b;
    return { ...b, pinned: !b.pinned };
  });
}

function addFolder(folders, name, parentId, uidFn) {
  return [...folders, { id: uidFn(), name: name.trim(), parentId: parentId || null }];
}

function deleteFolder(bookmarks, folders, fid) {
  const sub = belowIds(fid, folders);
  const all = [fid, ...sub];
  const newBookmarks = bookmarks.map((b) => (all.includes(b.folder) ? { ...b, folder: null } : b));
  const newFolders = folders.filter((f) => !all.includes(f.id));
  return { bookmarks: newBookmarks, folders: newFolders };
}

function renameFolder(folders, fid, newName) {
  return folders.map((f) => (f.id === fid ? { ...f, name: newName.trim() } : f));
}

module.exports = {
  uid,
  domn,
  fav,
  validHex,
  adj,
  allTags,
  childFolders,
  belowIds,
  cntBelow,
  getFiltered,
  parseBookmarkHTML,
  buildExportHTML,
  addBookmark,
  editBookmark,
  deleteBookmark,
  togglePin,
  addFolder,
  deleteFolder,
  renameFolder,
};
