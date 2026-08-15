const DOCUMENT_TITLE = 'BLACKBOX 33기 지원서 응답';

const QUESTION_ORDER = [
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

function doPost(e) {
  const params = e.parameter || {};
  const doc = getOrCreateDocument();
  const body = doc.getBody();
  const submittedAt = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy.MM.dd HH:mm');
  const applicantName = params['이름'] || '이름 없음';

  if (body.getText().trim()) {
    body.appendPageBreak();
  }

  body.appendParagraph(`${applicantName} 지원서`)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`제출 시각: ${submittedAt}`);
  body.appendHorizontalRule();

  QUESTION_ORDER.forEach((key) => {
    body.appendParagraph(key).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(params[key] || '-');
  });

  doc.saveAndClose();

  return HtmlService.createHtmlOutput(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="0; url=https://blackbox-theta.vercel.app/application-thanks.html">
      </head>
      <body>제출이 완료되었습니다.</body>
    </html>
  `);
}

function getOrCreateDocument() {
  const files = DriveApp.getFilesByName(DOCUMENT_TITLE);
  if (files.hasNext()) {
    return DocumentApp.openById(files.next().getId());
  }
  return DocumentApp.create(DOCUMENT_TITLE);
}
