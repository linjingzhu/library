# 원문 PDF

첨부받은 세 PDF 원본을 변경 없이 보관합니다. 영문 파일명은 안정적인 링크를 위한 이름이며, 원래 이름과 SHA-256은 [manifest.json](manifest.json)에 기록되어 있습니다.

| 책 | 원문 PDF | 활용 가능한 지식 데이터 | PDF 쪽수 |
| --- | --- | --- | --- |
| 행복한 커플은 어떻게 싸우는가 | [conflict.pdf](pdfs/conflict.pdf) | [conflict.json](../content/conflict.json) | 466 |
| 5가지 사랑의 언어 | [love.pdf](pdfs/love.pdf) | [love.json](../content/love.json) | 256 |
| 노자의 말 | [tao.pdf](pdfs/tao.pdf) | [tao.json](../content/tao.json) | 230 |

PDF는 이미지 기반 스캔본입니다. 원문 내용을 새로 추출하려면 한국어 OCR이 필요합니다. 기존에 정리한 지식은 각 JSON의 `summary`, `application`, `points`, `practice`, `keywords`에서 바로 활용할 수 있습니다. `application`과 `practice`는 편집 제안입니다. `chapters[].pages`와 `points[].page`는 PDF의 물리 페이지(첫 쪽=1)를 가리키므로 원문 대조에 사용할 수 있습니다.

`content/<id>.json`의 `sourcePdf`가 이 폴더의 `pdfs/` 파일을 연결합니다. 빌드하면 `dist/sources/pdfs/`에 복사되며, 사이트의 책 소개에서 원문을 새 탭으로 엽니다. 원문은 요청할 때만 내려받으므로 첫 화면에서 세 PDF를 모두 로드하지 않습니다.

새 원문을 추가할 때는 PDF와 지식 JSON을 추가하고 manifest에 원본 이름, 크기, 페이지 수, SHA-256을 기록합니다. `npm test`로 대응 관계와 무결성을 검사하고 `npm run build:pages`로 게시 파일을 생성합니다. 자세한 자료 형식은 [라이브러리 안내](../README.library.md#새-pdf-추가)를 참고하세요.
