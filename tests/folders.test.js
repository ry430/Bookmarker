const { allTags, childFolders, belowIds, cntBelow, addFolder, deleteFolder, renameFolder } = require('../src/logic');

const FOLDERS = [
  { id: 'f1', name: 'Design', parentId: null },
  { id: 'f2', name: 'Development', parentId: null },
  { id: 'f3', name: 'Tools', parentId: null },
  { id: 'f5', name: 'Frontend', parentId: 'f2' },
  { id: 'f6', name: 'Backend', parentId: 'f2' },
  { id: 'f7', name: 'React', parentId: 'f5' },
];

const BOOKMARKS = [
  { id: 'b1', url: 'https://github.com', title: 'GitHub', folder: 'f2', tags: ['git', 'code'], added: 1000 },
  { id: 'b2', url: 'https://figma.com', title: 'Figma', folder: 'f1', tags: ['design', 'ui'], added: 2000 },
  { id: 'b3', url: 'https://react.dev', title: 'React', folder: 'f7', tags: ['code', 'react'], added: 3000 },
  { id: 'b4', url: 'https://nextjs.org', title: 'Next.js', folder: 'f5', tags: ['code'], added: 4000 },
  { id: 'b5', url: 'https://anthropic.com', title: 'Anthropic', folder: null, tags: ['ai'], added: 5000 },
];

describe('allTags', () => {
  test('collects and sorts unique tags from all bookmarks', () => {
    expect(allTags(BOOKMARKS)).toEqual(['ai', 'code', 'design', 'git', 'react', 'ui']);
  });

  test('returns empty array for no bookmarks', () => {
    expect(allTags([])).toEqual([]);
  });

  test('handles bookmarks with no tags', () => {
    expect(allTags([{ id: '1', tags: null }, { id: '2' }])).toEqual([]);
  });
});

describe('childFolders', () => {
  test('returns top-level folders for null parent', () => {
    const result = childFolders(null, FOLDERS);
    expect(result.map((f) => f.id)).toEqual(['f1', 'f2', 'f3']);
  });

  test('returns child folders of a specific parent', () => {
    const result = childFolders('f2', FOLDERS);
    expect(result.map((f) => f.id)).toEqual(['f5', 'f6']);
  });

  test('returns nested children', () => {
    const result = childFolders('f5', FOLDERS);
    expect(result.map((f) => f.id)).toEqual(['f7']);
  });

  test('returns empty for leaf folders', () => {
    expect(childFolders('f7', FOLDERS)).toEqual([]);
  });
});

describe('belowIds', () => {
  test('returns all descendant IDs recursively', () => {
    expect(belowIds('f2', FOLDERS).sort()).toEqual(['f5', 'f6', 'f7'].sort());
  });

  test('returns single child when only one level deep', () => {
    expect(belowIds('f5', FOLDERS)).toEqual(['f7']);
  });

  test('returns empty for leaf folders', () => {
    expect(belowIds('f1', FOLDERS)).toEqual([]);
  });
});

describe('cntBelow', () => {
  test('counts bookmarks in folder and all descendants', () => {
    // f2 has b1, f5 has b4, f7 has b3 => 3 total
    expect(cntBelow('f2', FOLDERS, BOOKMARKS)).toBe(3);
  });

  test('counts bookmarks in a single leaf folder', () => {
    expect(cntBelow('f7', FOLDERS, BOOKMARKS)).toBe(1);
  });

  test('returns 0 for empty folder', () => {
    expect(cntBelow('f3', FOLDERS, BOOKMARKS)).toBe(0);
  });
});

describe('addFolder', () => {
  test('adds a top-level folder', () => {
    let counter = 0;
    const result = addFolder([], 'New Folder', null, () => `nf${++counter}`);
    expect(result).toEqual([{ id: 'nf1', name: 'New Folder', parentId: null }]);
  });

  test('adds a subfolder', () => {
    const result = addFolder(FOLDERS, 'Vue', 'f5', () => 'f99');
    expect(result).toHaveLength(FOLDERS.length + 1);
    expect(result[result.length - 1]).toEqual({ id: 'f99', name: 'Vue', parentId: 'f5' });
  });

  test('trims whitespace from name', () => {
    const result = addFolder([], '  Trimmed  ', null, () => 'x');
    expect(result[0].name).toBe('Trimmed');
  });
});

describe('deleteFolder', () => {
  test('removes folder and moves its bookmarks to unfiled', () => {
    const { bookmarks, folders } = deleteFolder(BOOKMARKS, FOLDERS, 'f1');
    expect(folders.find((f) => f.id === 'f1')).toBeUndefined();
    expect(bookmarks.find((b) => b.id === 'b2').folder).toBeNull();
  });

  test('removes folder and all descendants', () => {
    const { bookmarks, folders } = deleteFolder(BOOKMARKS, FOLDERS, 'f2');
    expect(folders.map((f) => f.id)).not.toContain('f2');
    expect(folders.map((f) => f.id)).not.toContain('f5');
    expect(folders.map((f) => f.id)).not.toContain('f6');
    expect(folders.map((f) => f.id)).not.toContain('f7');
    // all bookmarks that were in f2/f5/f7 should be unfiled
    expect(bookmarks.find((b) => b.id === 'b1').folder).toBeNull();
    expect(bookmarks.find((b) => b.id === 'b3').folder).toBeNull();
    expect(bookmarks.find((b) => b.id === 'b4').folder).toBeNull();
  });

  test('does not affect other folders or bookmarks', () => {
    const { bookmarks, folders } = deleteFolder(BOOKMARKS, FOLDERS, 'f3');
    expect(folders).toHaveLength(FOLDERS.length - 1);
    expect(bookmarks).toEqual(BOOKMARKS);
  });
});

describe('renameFolder', () => {
  test('renames the target folder', () => {
    const result = renameFolder(FOLDERS, 'f1', '  Branding  ');
    expect(result.find((f) => f.id === 'f1').name).toBe('Branding');
  });

  test('does not change other folders', () => {
    const result = renameFolder(FOLDERS, 'f1', 'X');
    expect(result.find((f) => f.id === 'f2').name).toBe('Development');
  });
});
