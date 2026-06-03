const { addBookmark, editBookmark, deleteBookmark, togglePin } = require('../src/logic');

describe('addBookmark', () => {
  test('adds a bookmark to the beginning of the list', () => {
    const existing = [{ id: 'old', url: 'https://old.com', title: 'Old', folder: null, tags: [], notes: '', added: 1000 }];
    const result = addBookmark(existing, { url: 'https://new.com', title: 'New' }, () => 'new-id');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('new-id');
    expect(result[0].url).toBe('https://new.com');
    expect(result[0].title).toBe('New');
  });

  test('uses hostname as title when title is empty', () => {
    const result = addBookmark([], { url: 'https://example.com', title: '' }, () => 'id');
    expect(result[0].title).toBe('example.com');
  });

  test('sets default values for missing fields', () => {
    const result = addBookmark([], { url: 'https://x.com' }, () => 'id');
    expect(result[0].folder).toBeNull();
    expect(result[0].tags).toEqual([]);
    expect(result[0].notes).toBe('');
    expect(result[0].added).toBeGreaterThan(0);
  });

  test('preserves folder assignment', () => {
    const result = addBookmark([], { url: 'https://x.com', title: 'X', folder: 'f1' }, () => 'id');
    expect(result[0].folder).toBe('f1');
  });

  test('preserves tags', () => {
    const result = addBookmark([], { url: 'https://x.com', title: 'X', tags: ['a', 'b'] }, () => 'id');
    expect(result[0].tags).toEqual(['a', 'b']);
  });
});

describe('editBookmark', () => {
  const base = [
    { id: 'b1', url: 'https://old.com', title: 'Old', folder: 'f1', tags: ['a'], notes: 'note' },
    { id: 'b2', url: 'https://keep.com', title: 'Keep', folder: null, tags: [], notes: '' },
  ];

  test('updates URL and title', () => {
    const result = editBookmark(base, 'b1', { url: 'https://new.com', title: 'New' });
    expect(result[0].url).toBe('https://new.com');
    expect(result[0].title).toBe('New');
  });

  test('does not change other bookmarks', () => {
    const result = editBookmark(base, 'b1', { url: 'https://new.com', title: 'New' });
    expect(result[1]).toEqual(base[1]);
  });

  test('falls back to hostname when title is empty', () => {
    const result = editBookmark(base, 'b1', { url: 'https://fallback.com', title: '' });
    expect(result[0].title).toBe('fallback.com');
  });

  test('updates folder', () => {
    const result = editBookmark(base, 'b1', { folder: 'f2' });
    expect(result[0].folder).toBe('f2');
  });

  test('updates tags and notes', () => {
    const result = editBookmark(base, 'b1', { tags: ['x', 'y'], notes: 'updated' });
    expect(result[0].tags).toEqual(['x', 'y']);
    expect(result[0].notes).toBe('updated');
  });

  test('can set folder to null', () => {
    const result = editBookmark(base, 'b1', { folder: null });
    expect(result[0].folder).toBeNull();
  });
});

describe('deleteBookmark', () => {
  const list = [
    { id: 'b1', url: 'https://a.com', title: 'A' },
    { id: 'b2', url: 'https://b.com', title: 'B' },
    { id: 'b3', url: 'https://c.com', title: 'C' },
  ];

  test('removes the specified bookmark', () => {
    const result = deleteBookmark(list, 'b2');
    expect(result).toHaveLength(2);
    expect(result.find((b) => b.id === 'b2')).toBeUndefined();
  });

  test('preserves other bookmarks', () => {
    const result = deleteBookmark(list, 'b2');
    expect(result[0].id).toBe('b1');
    expect(result[1].id).toBe('b3');
  });

  test('returns same list when ID does not exist', () => {
    const result = deleteBookmark(list, 'nonexistent');
    expect(result).toHaveLength(3);
  });

  test('handles empty list', () => {
    expect(deleteBookmark([], 'b1')).toEqual([]);
  });
});

describe('togglePin', () => {
  test('pins an unpinned bookmark', () => {
    const list = [{ id: 'b1', url: 'https://a.com', pinned: false }];
    const result = togglePin(list, 'b1');
    expect(result[0].pinned).toBe(true);
  });

  test('unpins a pinned bookmark', () => {
    const list = [{ id: 'b1', url: 'https://a.com', pinned: true }];
    const result = togglePin(list, 'b1');
    expect(result[0].pinned).toBe(false);
  });

  test('pins a bookmark that has no pinned property', () => {
    const list = [{ id: 'b1', url: 'https://a.com' }];
    const result = togglePin(list, 'b1');
    expect(result[0].pinned).toBe(true);
  });

  test('does not change other bookmarks', () => {
    const list = [
      { id: 'b1', url: 'https://a.com', pinned: false },
      { id: 'b2', url: 'https://b.com', pinned: true },
    ];
    const result = togglePin(list, 'b1');
    expect(result[1].pinned).toBe(true);
  });
});
