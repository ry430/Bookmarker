const { parseBookmarkHTML, buildExportHTML } = require('../src/logic');

const NETSCAPE_SIMPLE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><A HREF="https://github.com" ADD_DATE="1700000000" TAGS="git,code">GitHub</A>
    <DT><A HREF="https://figma.com" ADD_DATE="1700001000">Figma</A>
</DL><p>`;

const NETSCAPE_WITH_FOLDERS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<DL><p>
    <DT><H3>Dev</H3>
    <DL><p>
        <DT><A HREF="https://react.dev">React</A>
        <DT><H3>Backend</H3>
        <DL><p>
            <DT><A HREF="https://nodejs.org" TAGS="runtime">Node.js</A>
        </DL><p>
    </DL><p>
    <DT><A HREF="https://news.ycombinator.com">HN</A>
</DL><p>`;

let counter = 0;
const mockUid = () => `test-${++counter}`;
beforeEach(() => { counter = 0; });

describe('parseBookmarkHTML', () => {
  test('imports simple bookmarks', () => {
    const result = parseBookmarkHTML(NETSCAPE_SIMPLE, [], [], mockUid);
    expect(result.imported).toBe(2);
    expect(result.bookmarks).toHaveLength(2);
    expect(result.bookmarks[0].url).toBe('https://github.com');
    expect(result.bookmarks[0].title).toBe('GitHub');
    expect(result.bookmarks[0].tags).toEqual(['git', 'code']);
    expect(result.bookmarks[0].added).toBe(1700000000000);
  });

  test('imports bookmarks without tags', () => {
    const result = parseBookmarkHTML(NETSCAPE_SIMPLE, [], [], mockUid);
    expect(result.bookmarks[1].tags).toEqual([]);
    expect(result.bookmarks[1].title).toBe('Figma');
  });

  test('creates folders from HTML structure', () => {
    const result = parseBookmarkHTML(NETSCAPE_WITH_FOLDERS, [], [], mockUid);
    expect(result.folderCount).toBe(2);
    expect(result.folders.some((f) => f.name === 'Dev')).toBe(true);
    expect(result.folders.some((f) => f.name === 'Backend')).toBe(true);
  });

  test('assigns bookmarks to correct folders', () => {
    const result = parseBookmarkHTML(NETSCAPE_WITH_FOLDERS, [], [], mockUid);
    const devFolder = result.folders.find((f) => f.name === 'Dev');
    const backendFolder = result.folders.find((f) => f.name === 'Backend');
    const react = result.bookmarks.find((b) => b.url === 'https://react.dev');
    const node = result.bookmarks.find((b) => b.url === 'https://nodejs.org');
    const hn = result.bookmarks.find((b) => b.url === 'https://news.ycombinator.com');

    expect(react.folder).toBe(devFolder.id);
    expect(node.folder).toBe(backendFolder.id);
    expect(hn.folder).toBeNull();
  });

  test('nests subfolders correctly', () => {
    const result = parseBookmarkHTML(NETSCAPE_WITH_FOLDERS, [], [], mockUid);
    const devFolder = result.folders.find((f) => f.name === 'Dev');
    const backendFolder = result.folders.find((f) => f.name === 'Backend');
    expect(backendFolder.parentId).toBe(devFolder.id);
  });

  test('skips duplicate URLs', () => {
    const existing = [{ id: 'e1', url: 'https://github.com', title: 'GH', folder: null, tags: [], notes: '', added: 1000 }];
    const result = parseBookmarkHTML(NETSCAPE_SIMPLE, existing, [], mockUid);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  test('refiles unfiled duplicates into imported folder', () => {
    const existing = [{ id: 'e1', url: 'https://react.dev', title: 'React', folder: null, tags: [], notes: '', added: 1000 }];
    const result = parseBookmarkHTML(NETSCAPE_WITH_FOLDERS, existing, [], mockUid);
    const reactBk = result.bookmarks.find((b) => b.url === 'https://react.dev');
    expect(reactBk.folder).not.toBeNull();
    expect(result.refiled).toBe(1);
  });

  test('skips javascript: and place: URLs', () => {
    const html = `<DL><p>
      <DT><A HREF="javascript:void(0)">JS Link</A>
      <DT><A HREF="place:sort=8&maxResults=10">Firefox Places</A>
      <DT><A HREF="https://valid.com">Valid</A>
    </DL><p>`;
    const result = parseBookmarkHTML(html, [], [], mockUid);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(2);
  });

  test('reuses existing folder instead of duplicating', () => {
    const existingFolders = [{ id: 'ef1', name: 'Dev', parentId: null }];
    const result = parseBookmarkHTML(NETSCAPE_WITH_FOLDERS, [], existingFolders, mockUid);
    expect(result.folders.filter((f) => f.name === 'Dev')).toHaveLength(1);
    expect(result.folders.find((f) => f.name === 'Dev').id).toBe('ef1');
  });
});

describe('buildExportHTML', () => {
  const folders = [
    { id: 'f1', name: 'Design', parentId: null },
    { id: 'f2', name: 'Dev', parentId: null },
    { id: 'f3', name: 'Frontend', parentId: 'f2' },
  ];
  const bookmarks = [
    { id: 'b1', url: 'https://figma.com', title: 'Figma', folder: 'f1', tags: ['design'], added: 1700000000000 },
    { id: 'b2', url: 'https://react.dev', title: 'React', folder: 'f3', tags: ['code', 'react'], added: 1700001000000 },
    { id: 'b3', url: 'https://news.ycombinator.com', title: 'HN', folder: null, tags: [], added: 1700002000000 },
  ];

  test('generates valid Netscape bookmark HTML', () => {
    const html = buildExportHTML(bookmarks, folders);
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html).toContain('<TITLE>Bookmarks</TITLE>');
    expect(html).toContain('<H1>Bookmarks</H1>');
  });

  test('includes folder hierarchy', () => {
    const html = buildExportHTML(bookmarks, folders);
    expect(html).toContain('<H3>Design</H3>');
    expect(html).toContain('<H3>Dev</H3>');
    expect(html).toContain('<H3>Frontend</H3>');
  });

  test('includes bookmarks with correct attributes', () => {
    const html = buildExportHTML(bookmarks, folders);
    expect(html).toContain('HREF="https://figma.com"');
    expect(html).toContain('ADD_DATE="1700000000"');
    expect(html).toContain('TAGS="design"');
    expect(html).toContain('>Figma</A>');
  });

  test('includes unfiled bookmarks at root level', () => {
    const html = buildExportHTML(bookmarks, folders);
    expect(html).toContain('HREF="https://news.ycombinator.com"');
    expect(html).toContain('>HN</A>');
  });

  test('includes multi-tag bookmarks', () => {
    const html = buildExportHTML(bookmarks, folders);
    expect(html).toContain('TAGS="code,react"');
  });

  test('omits TAGS attribute when tags are empty', () => {
    const html = buildExportHTML(bookmarks, folders);
    const hnLine = html.split('\n').find((l) => l.includes('news.ycombinator.com'));
    expect(hnLine).not.toContain('TAGS=');
  });

  test('round-trips: export then import recovers same data', () => {
    const html = buildExportHTML(bookmarks, folders);
    let c = 0;
    const result = parseBookmarkHTML(html, [], [], () => `rt-${++c}`);
    expect(result.imported).toBe(3);
    expect(result.bookmarks.map((b) => b.url).sort()).toEqual(
      bookmarks.map((b) => b.url).sort()
    );
    expect(result.folders.some((f) => f.name === 'Design')).toBe(true);
    expect(result.folders.some((f) => f.name === 'Dev')).toBe(true);
    expect(result.folders.some((f) => f.name === 'Frontend')).toBe(true);
  });
});
