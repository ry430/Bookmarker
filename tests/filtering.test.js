const { getFiltered } = require('../src/logic');

const FOLDERS = [
  { id: 'f1', name: 'Design', parentId: null },
  { id: 'f2', name: 'Development', parentId: null },
  { id: 'f5', name: 'Frontend', parentId: 'f2' },
];

const now = Date.now();
const BOOKMARKS = [
  { id: 'b1', url: 'https://github.com', title: 'GitHub', folder: 'f2', tags: ['git', 'code'], notes: '', added: now - 100000 },
  { id: 'b2', url: 'https://figma.com', title: 'Figma', folder: 'f1', tags: ['design'], notes: 'Design tool', added: now - 200000 },
  { id: 'b3', url: 'https://react.dev', title: 'React', folder: 'f5', tags: ['code', 'react'], notes: '', added: now - 300000 },
  { id: 'b4', url: 'https://anthropic.com', title: 'Anthropic', folder: null, tags: ['ai'], notes: 'AI research', added: now - 400000 },
  { id: 'b5', url: 'https://old.example.com', title: 'Old Site', folder: null, tags: [], notes: '', added: now - 8 * 86400000 },
];

const defaults = { view: 'all', activeTag: null, sortVal: 'newest', searchQuery: '' };

describe('getFiltered – view modes', () => {
  test('all view returns every bookmark', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, defaults);
    expect(result).toHaveLength(5);
  });

  test('recent view returns only bookmarks added within 7 days', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, view: 'recent' });
    expect(result.map((b) => b.id)).not.toContain('b5');
    expect(result).toHaveLength(4);
  });

  test('unfiled view returns only bookmarks with no folder', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, view: 'unfiled' });
    expect(result.every((b) => !b.folder)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('folder view returns bookmarks in that folder and subfolders', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, view: 'folder:f2' });
    // f2 has b1, f5 (child of f2) has b3
    expect(result.map((b) => b.id).sort()).toEqual(['b1', 'b3']);
  });

  test('leaf folder view returns only its direct bookmarks', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, view: 'folder:f5' });
    expect(result.map((b) => b.id)).toEqual(['b3']);
  });
});

describe('getFiltered – tag filtering', () => {
  test('filters by active tag', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, activeTag: 'code' });
    expect(result.map((b) => b.id).sort()).toEqual(['b1', 'b3']);
  });

  test('returns empty when tag matches nothing', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, activeTag: 'nonexistent' });
    expect(result).toHaveLength(0);
  });
});

describe('getFiltered – search', () => {
  test('searches by title', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, searchQuery: 'github' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
  });

  test('searches by URL', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, searchQuery: 'figma.com' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b2');
  });

  test('searches by notes', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, searchQuery: 'research' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b4');
  });

  test('searches by tags', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, searchQuery: 'react' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b3');
  });

  test('search is case-insensitive', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, searchQuery: 'GITHUB' });
    expect(result).toHaveLength(1);
  });

  test('empty search returns all', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, searchQuery: '  ' });
    expect(result).toHaveLength(5);
  });
});

describe('getFiltered – sorting', () => {
  test('newest first (default)', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, sortVal: 'newest' });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].added).toBeGreaterThanOrEqual(result[i].added);
    }
  });

  test('oldest first', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, sortVal: 'oldest' });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].added).toBeLessThanOrEqual(result[i].added);
    }
  });

  test('A to Z', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, sortVal: 'az' });
    const titles = result.map((b) => b.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  test('Z to A', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, { ...defaults, sortVal: 'za' });
    const titles = result.map((b) => b.title);
    expect(titles).toEqual([...titles].sort((a, b) => b.localeCompare(a)));
  });

  test('pinned items always come first', () => {
    const bks = BOOKMARKS.map((b) => (b.id === 'b5' ? { ...b, pinned: true } : b));
    const result = getFiltered(bks, FOLDERS, { ...defaults, sortVal: 'newest' });
    expect(result[0].id).toBe('b5');
  });
});

describe('getFiltered – combined filters', () => {
  test('view + tag + search combined', () => {
    const result = getFiltered(BOOKMARKS, FOLDERS, {
      view: 'all',
      activeTag: 'code',
      sortVal: 'newest',
      searchQuery: 'react',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b3');
  });
});
