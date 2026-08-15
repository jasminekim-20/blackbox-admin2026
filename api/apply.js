const NOTION_VERSION = '2022-06-28';
const NOTION_PARENT_PAGE_ID = '3b759fed505280eebfe7c00313423a48';

const FIELD_LABELS = [
  '이름',
  '학번',
  '학과',
  '연락처',
  '이메일',
  '학년 또는 재학 상태',
  '1. 자기소개 및 블랙박스 지원 이유',
  '2. 본인만의 강점 또는 능력',
  '3. 협업과 팀워크 경험 및 적용',
  '4. 실현하고 싶은 창업 아이디어',
  '창업 관심도',
  '6. 블랙박스 활동을 통해 기대하는 성장',
  '정규 세션 참여 가능 여부'
];

const QUESTION_TITLES = {
  '1. 자기소개 및 블랙박스 지원 이유': '1. 간단한 자기소개와 함께, 다양한 창업 동아리 중에서 블랙박스를 선택하고 지원하시게 된 이유',
  '2. 본인만의 강점 또는 능력': '2. 본인만의 강점이나 능력',
  '3. 협업과 팀워크 경험 및 적용': '3. 협업과 팀워크 경험 및 블랙박스에서의 적용',
  '4. 실현하고 싶은 창업 아이디어': '4. 실현하고 싶은 자신만의 창업 아이디어',
  '창업 관심도': '5. 창업과 관련한 흥미',
  '6. 블랙박스 활동을 통해 기대하는 성장': '6. 블랙박스에서 활동하며 기대하는 성장',
  '정규 세션 참여 가능 여부': '7. 정규 세션 참여 가능 여부'
};

function richText(content) {
  return [
    {
      type: 'text',
      text: {
        content: String(content || '-').slice(0, 2000)
      }
    }
  ];
}

function textBlock(type, content) {
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: richText(content)
    }
  };
}

function paragraph(content) {
  return textBlock('paragraph', content);
}

function heading2(content) {
  return textBlock('heading_2', content);
}

function heading3(content) {
  return textBlock('heading_3', content);
}

function divider() {
  return {
    object: 'block',
    type: 'divider',
    divider: {}
  };
}

function chunkBlocks(blocks) {
  const chunks = [];

  for (let i = 0; i < blocks.length; i += 80) {
    chunks.push(blocks.slice(i, i + 80));
  }

  return chunks;
}

async function parseBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const params = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  const data = {};

  for (const [key, value] of params.entries()) {
    data[key] = value;
  }

  return data;
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

function formatDateTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
}

function buildBlocks(data) {
  const blocks = [
    heading2('기본 정보'),
    ...FIELD_LABELS.slice(0, 6).flatMap((label) => [
      heading3(label),
      paragraph(data[label])
    ]),
    divider(),
    heading2('지원서 답변')
  ];

  FIELD_LABELS.slice(6).forEach((label) => {
    blocks.push(heading3(QUESTION_TITLES[label] || label));
    blocks.push(paragraph(data[label]));
  });

  blocks.push(divider());
  blocks.push(paragraph(`제출 시각: ${formatDateTime()}`));

  return blocks;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.NOTION_TOKEN) {
    res.status(503).json({ error: 'NOTION_TOKEN is not configured' });
    return;
  }

  try {
    const data = await parseBody(req);

    if (data.__dry_run === '1') {
      await notionRequest(`/pages/${NOTION_PARENT_PAGE_ID}`);
      res.status(200).json({ ok: true, dryRun: true });
      return;
    }

    const name = data['이름'] || '이름 없음';
    const studentId = data['학번'] || '학번 없음';
    const title = `${name} (${studentId}) - ${formatDateTime()}`;
    const [firstChunk, ...restChunks] = chunkBlocks(buildBlocks(data));

    const page = await notionRequest('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { page_id: NOTION_PARENT_PAGE_ID },
        properties: {
          title: richText(title)
        },
        children: firstChunk
      })
    });

    for (const chunk of restChunks) {
      await notionRequest(`/blocks/${page.id}/children`, {
        method: 'PATCH',
        body: JSON.stringify({ children: chunk })
      });
    }

    res.status(200).json({ ok: true, pageId: page.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};
