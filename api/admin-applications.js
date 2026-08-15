const NOTION_VERSION = '2022-06-28';
const NOTION_PARENT_PAGE_ID = '3b759fed505280eebfe7c00313423a48';

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function notionRequest(path, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Notion API error ${response.status}: ${message}`);
  }

  return response.json();
}

async function getPaginatedBlocks(blockId) {
  const blocks = [];
  let cursor;

  do {
    const params = new URLSearchParams({ page_size: '100' });

    if (cursor) {
      params.set('start_cursor', cursor);
    }

    const data = await notionRequest(`/blocks/${blockId}/children?${params.toString()}`);
    blocks.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

function richTextToPlain(richText = []) {
  return richText.map((item) => item.plain_text || '').join('').trim();
}

function getBlockText(block) {
  if (!block || !block.type || !block[block.type]) return '';

  return richTextToPlain(block[block.type].rich_text);
}

function parseTitle(title) {
  const match = title.match(/^(.*?)\s*\((.*?)\)\s*-\s*(.*)$/);

  if (!match) {
    return {
      name: title || '이름 없음',
      studentId: '',
      submittedAt: ''
    };
  }

  return {
    name: match[1].trim(),
    studentId: match[2].trim(),
    submittedAt: match[3].trim()
  };
}

function parseApplicationPage(pageBlock, blocks) {
  const title = pageBlock.child_page?.title || '지원서';
  const parsedTitle = parseTitle(title);
  const fields = {};
  let currentLabel = '';

  for (const block of blocks) {
    if (block.type === 'heading_3') {
      currentLabel = getBlockText(block);
      continue;
    }

    if (currentLabel && block.type === 'paragraph') {
      fields[currentLabel] = getBlockText(block) || '-';
      currentLabel = '';
    }
  }

  return {
    id: pageBlock.id,
    title,
    ...parsedTitle,
    fields
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.NOTION_TOKEN || !process.env.ADMIN_PASSWORD) {
    res.status(503).json({ error: 'Admin dashboard is not configured' });
    return;
  }

  try {
    const body = await readJson(req);

    if (body.password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    const childBlocks = await getPaginatedBlocks(NOTION_PARENT_PAGE_ID);
    const pageBlocks = childBlocks.filter((block) => block.type === 'child_page');
    const applications = [];

    for (const pageBlock of pageBlocks) {
      const blocks = await getPaginatedBlocks(pageBlock.id);
      applications.push(parseApplicationPage(pageBlock, blocks));
    }

    applications.sort((a, b) => b.title.localeCompare(a.title, 'ko'));
    res.status(200).json({ ok: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load applications' });
  }
};
