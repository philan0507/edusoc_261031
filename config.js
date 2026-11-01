/*
 * 사이트 설정 파일 — 화면에 보이는 모든 내용은 이 파일에서 고칩니다.
 * (※ 표시가 있는 값은 예시이니 실제 정보로 바꿔 주세요.)
 * 서버 없이 index.html을 더블클릭해 열면 이 파일을 바로 읽어 옵니다.
 */
window.SITE_CONFIG = {
  meta: {
    title: "교육사회학 | 데이터로 읽는 교육과 사회",
    description: "교육 불평등, 학업성취 격차, 학교와 사회의 관계를 데이터로 탐구하는 예비교사를 위한 교육사회학 강의 소개."
  },

  brand: { logo: "assets/logo.webp", name: "교육사회학" }, // logo: 강좌 로고 이미지 경로

  // 헤더 메뉴. id는 아래 각 섹션의 id와 같아야 합니다.
  nav: [
    { id: "about", label: "프로그램 소개" },
    { id: "curriculum", label: "커리큘럼" },
    { id: "enroll", label: "수강 안내" },
    { id: "classroom", label: "강의실" },
    { id: "faq", label: "FAQ" },
    { id: "instructor", label: "교수자" }
  ],

  // 첫 화면
  hero: {
    badge: "", // 첫 화면 제목 위에 표시할 배지. 비워 두면 표시되지 않습니다.
    title: "교육사회학",
    subtitle: "데이터로 읽는 교육과 사회",
    description:
      "학교와 사회의 관계, 교육 불평등과 학업성취 격차, AI 시대의 새로운 교육 격차까지 교육사회학의 핵심 질문을 데이터로 분석하며 탐구합니다. 예비교사로서 마주할 교실의 현실을 사회구조와 연결해 이해하고, 모든 학생의 배움을 지원하는 교사의 실천을 함께 설계합니다.",
    primary: { label: "회원 가입", target: "apply" },
    secondary: { label: "커리큘럼 보기", target: "curriculum" }
  },

  // 한눈에 보는 강의 정보 (※ 예시)
  overview: [
    { icon: "📅", label: "일정", value: "2027학년도 1학기 · 15주" },
    { icon: "⏰", label: "시간", value: "매주 화 10:30–11:45" },
    { icon: "🧑‍🏫", label: "수업 방식", value: "강의 + 데이터 실습 + 토론" },
    { icon: "🎓", label: "수강 대상", value: "예비교사" }
  ],

  // 숫자 통계 카드 — 비워 두면 화면에 표시되지 않습니다.
  // 다시 쓰려면 이런 형식으로 추가하세요: { value: 15, suffix: "주", label: "과정" }  (value는 숫자, suffix는 숫자 뒤 단위)
  stats: [],

  // 프로그램 소개 + 장점 슬라이드
  about: {
    title: "📖 프로그램 소개",
    lead: "이 강의가 다른 이유를 옆으로 넘겨 보세요.",
    slides: [
      { icon: "📊", title: "데이터로 근거를 만든다", text: "공개 통계와 조사 자료를 직접 분석하며 교육 현상을 주장이 아닌 근거로 설명하는 힘을 기릅니다." },
      { icon: "🏫", title: "교실의 현실과 연결한다", text: "이론을 현장 사례에 대입해, 예비교사로서 곧 마주할 교실의 모습을 구조적으로 읽어 냅니다." },
      { icon: "🧰", title: "바로 쓰는 실습 도구", text: "스프레드시트와 시각화 도구로 나만의 분석을 만들고 수업 자료로 활용하는 방법까지 익힙니다." },
      { icon: "💬", title: "토론으로 생각을 넓힌다", text: "입시, 사교육, 다문화 등 쟁점을 놓고 서로 다른 입장을 듣고 논거를 세우는 연습을 합니다." },
      { icon: "🌱", title: "모두의 배움을 위한 실천", text: "격차를 이해하는 데서 멈추지 않고, 모든 학생의 배움을 지원하는 교사의 역할을 설계합니다." }
    ]
  },

  // 수업 일정 — 첫 수업 날짜(start)부터 매주 같은 요일에 15주 수업이 자동 배치됩니다. (※ 예시)
  schedule: {
    start: "2027-03-02", // 1주차 수업일 (화요일). 날짜를 바꾸면 모든 주차와 달력이 따라 바뀝니다.
    time: "10:30–11:45",
    place: "교양관 000호 (※ 예시)"
  },

  /*
   * 주차별 강의 (※ 학습 내용·영상·과제는 예시이니 실제 내용으로 바꿔 주세요.)
   *  - content : 학습 내용 (문장 목록)
   *  - videos  : 참고 영상 [{ title, url }] — 없으면 빈 배열 []
   *  - assignment(선택): { title, desc, daysAfter(수업일 + 며칠 뒤), time(마감 시각), submitUrl(제출 링크) }
   */
  curriculum: {
    title: "🗓️ 커리큘럼",
    lead: "주차를 눌러 학습 내용, 참고 영상, 과제를 확인하세요.",
    calendarTitle: "📅 수업 달력",
    calendarLead: "수업이 있는 날(매주 화요일)과 과제 마감일이 표시됩니다. 날짜를 누르면 그날의 수업 내용이 나옵니다.",
    units: [
      {
        title: "교육사회학의 관점과 질문",
        content: ["교육사회학이 던지는 질문과 학문의 성격", "강의 운영 방식과 평가 안내", "데이터로 교육을 읽는다는 것"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "기능주의와 교육",
        content: ["교육의 사회화·선발·배치 기능", "인간자본론과 교육투자", "기능주의에 대한 비판적 검토"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "갈등이론과 교육",
        content: ["교육과 계급·권력의 관계", "지위경쟁과 학력 인플레이션", "기능주의와 갈등이론 비교"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "교육과정과 학교문화",
        content: ["공식·잠재적 교육과정", "학교문화와 또래문화", "교실 속 상호작용 관찰하기"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }],
        assignment: {
          title: "학교문화 관찰 기록",
          desc: "자신이 경험한 학교(또는 교실)의 숨은 규범 한 가지를 골라 1쪽 분량으로 기록하고, 수업에서 배운 개념으로 해석하세요.",
          daysAfter: 6, time: "23:59", submitUrl: ""
        }
      },
      {
        title: "문화자본과 사회재생산",
        content: ["부르디외의 문화자본·아비투스", "보울스와 진티스의 대응이론", "교육은 불평등을 재생산하는가"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "교육 기회와 교육 불평등",
        content: ["교육 기회의 개념과 측정", "가정배경과 학업성취 격차", "공개 통계로 격차 확인하기 (데이터 실습)"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }],
        assignment: {
          title: "교육 불평등 지표 분석",
          desc: "제공된 공개 통계에서 지표 두 가지를 골라 표 또는 그래프로 정리하고, 해석을 5문장 이내로 작성하세요.",
          daysAfter: 6, time: "23:59", submitUrl: ""
        }
      },
      {
        title: "중간고사",
        content: ["1–6주차 범위", "시험 방식과 유의사항은 공지를 확인하세요."],
        videos: []
      },
      {
        title: "학력주의·능력주의와 사회이동",
        content: ["학력주의와 능력주의 담론", "교육과 계층 이동", "능력주의의 공정성 논쟁"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "젠더와 교육",
        content: ["교육 속 성별 격차의 변화", "성별 고정관념과 진로", "성평등 교육의 과제"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "이주·다문화와 포용교육",
        content: ["이주 배경 학생의 교육 경험", "다문화교육의 관점", "포용교육과 교사의 실천"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "지역과 교육 격차",
        content: ["지역 간 교육 여건 차이", "도농·권역별 격차 데이터 읽기", "지역 격차를 줄이는 정책"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }]
      },
      {
        title: "디지털 전환과 교육",
        content: ["에듀테크와 교육 기회", "디지털 격차의 새로운 얼굴", "AI 시대 교사의 역할"],
        videos: [{ title: "참고 영상 (※ 링크를 교체하세요)", url: "https://www.youtube.com/" }],
        assignment: {
          title: "팀 토론 주제 제안서",
          desc: "팀별로 토론하고 싶은 교육 현안 한 가지와 근거 자료 두 가지를 정리해 제출하세요.",
          daysAfter: 6, time: "23:59", submitUrl: ""
        }
      },
      {
        title: "교육 현안 팀 토론 ①",
        content: ["팀별 토론 발표와 질의응답", "토론 규칙과 평가 기준"],
        videos: []
      },
      {
        title: "교육 현안 팀 토론 ②",
        content: ["팀별 토론 발표와 질의응답", "학기 종합 정리"],
        videos: [],
        assignment: {
          title: "토론 성찰문",
          desc: "토론 과정에서 배운 점과 나의 입장 변화를 A4 1쪽으로 작성하세요.",
          daysAfter: 6, time: "23:59", submitUrl: ""
        }
      },
      {
        title: "기말고사",
        content: ["7–14주차 중심 범위", "시험 방식과 유의사항은 공지를 확인하세요."],
        videos: []
      }
    ]
  },

  enroll: {
    title: "📌 수강 안내",
    lead: "수강 신청 전에 아래 내용을 확인해 주세요.",
    items: [
      { label: "수강 대상", value: "예비교사" },
      { label: "선수 과목", value: "없음" },
      { label: "수강 신청", value: "학교 수강신청 시스템에서 신청" },
      { label: "평가 방법", value: "출석 10% · 중간 발표 30% · 토론 참여 20% · 기말 프로젝트 40%" },
      { label: "교재", value: "수업 시간에 안내 · 자료는 온라인 공유" }
    ],
    steps: [
      { title: "과목 확인", text: "강의 소개와 커리큘럼을 읽어 봅니다." },
      { title: "수강 신청", text: "수강신청 기간에 신청합니다." },
      { title: "첫 수업 참석", text: "1주차에 강의 운영 방식을 안내합니다." }
    ],
    note: "※ 일정과 정원은 학사 일정에 따라 변경될 수 있습니다."
  },

  // 수강 준비
  prepare: {
    title: "🎒 수강 준비",
    lead: "특별한 사전 지식은 필요 없습니다. 아래만 챙겨 오세요.",
    items: [
      { icon: "💻", title: "노트북 또는 태블릿", text: "데이터 실습 시간에 사용합니다. 학교 대여도 가능합니다. (※ 예시)" },
      { icon: "📈", title: "스프레드시트 기초", text: "엑셀 또는 구글 시트로 표를 열고 정렬해 본 경험이면 충분합니다." },
      { icon: "📰", title: "교육 뉴스 읽기", text: "관심 가는 교육 기사를 한 편 골라 첫 수업에 가져와 보세요." },
      { icon: "🙋", title: "열린 마음", text: "정답보다 질문을 환영합니다. 서로 다른 경험을 존중해 주세요." }
    ]
  },

  faq: {
    title: "💬 자주 묻는 질문",
    items: [
      { q: "교육학 전공자가 아니어도 들을 수 있나요?", a: "네. 예비교사라면 전공과 관계없이, 선수 지식 없이도 기초 개념부터 시작합니다." },
      { q: "데이터 분석 경험이 없어도 되나요?", a: "스프레드시트 기초만 있으면 됩니다. 실습 도구는 수업에서 차근차근 안내합니다." },
      { q: "수업은 어떻게 진행되나요?", a: "강의, 데이터 실습, 소그룹 토론을 번갈아 진행하며 매주 짧은 읽기 자료가 제공됩니다." },
      { q: "과제 부담이 큰가요?", a: "주간 읽기와 토론 준비, 중간 발표, 기말 팀 프로젝트로 구성됩니다." },
      { q: "문의는 어디로 하나요?", a: "페이지 맨 아래 교수자 연락처의 이메일로 연락해 주세요." }
    ]
  },

  // 푸터에 표시되는 교수자 소개 (※ 예시)
  instructor: {
    name: "김수영",
    nameEn: "Su Young Kim, Ph.D.",
    role: "연구교수",
    roleEn: "Research Professor",
    affiliation: "고려대학교 학부대학 원격교육센터",
    affiliationEn: "Distance Learning Center, University College, Korea University",
    photo: "assets/instructor.jpg", // 사진 파일을 이 경로에 넣으세요. 없으면 꽃 아이콘이 표시됩니다.
    bio: "기술과 제도가 교육 기회를 넓히는 동시에 새로운 격차를 만들 수 있다는 문제의식으로, 학생들이 교육 경험을 데이터와 학문의 언어로 해석하고 포용적 실천을 설계하도록 돕는 수업을 지향합니다.",
    areas: ["고등교육", "에듀테크", "포용교육"],
    contact: [
      { label: "E-mail", value: "philan73@korea.ac.kr", href: "mailto:philan73@korea.ac.kr" },
      { label: "Tel", value: "+82-2-3290-5071", href: "tel:+82232905071" }
    ]
  },

  /*
   * ───── 수강생 참여 기능 (4단계) ─────
   * ※ 서버가 없는 정적 사이트라 투표·회원 가입 정보·출석·제출 파일은 "이 브라우저 안"에만 저장됩니다.
   *   여러 사람의 응답을 한곳에 모으려면 별도의 서버(또는 구글 시트·Firebase 등) 연결이 필요합니다.
   */

  // 첫 방문 환영 폭죽 (처음 방문했을 때 한 번만 터집니다. 주소 끝에 ?welcome=1을 붙이면 다시 볼 수 있습니다.)
  welcome: { confetti: true },

  // 회원 가입 안내 팝업 (접속 후 delayMs 뒤에 표시, "오늘 하루 보지 않기" 선택 가능)
  popup: {
    enabled: true,
    delayMs: 2800,
    title: "2027학년도 1학기 회원 가입 안내",
    lines: [
      "교육사회학은 예비교사를 위한 강의입니다.",
      "회원 가입 양식을 작성해 제출해 주세요.",
      "수업은 매주 화요일 10:30–11:45입니다."
    ],
    cta: { label: "회원 가입하기", target: "apply" },
    hideLabel: "오늘 하루 보지 않기",
    closeLabel: "닫기"
  },

  // 회원 가입
  apply: {
    title: "✍️ 회원 가입",
    lead: "아래 항목을 작성해 제출해 주세요. * 표시는 필수 항목입니다.",
    fields: [
      { name: "userId", label: "아이디", type: "text", required: true, pattern: "^[a-z0-9_]{4,16}$", hint: "아이디는 영문 소문자·숫자·밑줄(_) 4–16자로 입력해 주세요", placeholder: "영문 소문자·숫자 4–16자" },
      { name: "password", label: "비밀번호", type: "password", required: true, minLength: 8, hint: "비밀번호는 8자 이상으로 입력해 주세요", placeholder: "8자 이상" },
      { name: "password2", label: "비밀번호 확인", type: "password", required: true, matches: "password", hint: "비밀번호가 서로 다릅니다" },
      { name: "name", label: "이름", type: "text", required: true, placeholder: "홍길동" },
      { name: "studentId", label: "학번", type: "text", required: true, pattern: "^[0-9]{6,10}$", hint: "학번은 숫자 6–10자리로 입력해 주세요", placeholder: "2027000000" },
      { name: "phone", label: "휴대폰", type: "tel", required: true, pattern: "^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$", hint: "휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요", placeholder: "010-0000-0000" },
      { name: "consent", label: "회원 가입을 위한 개인정보 수집·이용에 동의합니다.", type: "checkbox", required: true }
    ],
    submitLabel: "가입하기",
    successTitle: "회원 가입이 완료되었습니다",
    emptyText: "아직 가입 내역이 없습니다."
  },

  // 학습 주제 투표 (결과는 막대그래프)
  poll: {
    title: "🗳️ 가장 먼저 배우고 싶은 주제",
    lead: "한 가지를 골라 투표해 주세요. 결과는 바로 막대그래프에 반영되고, 다시 투표하면 선택을 바꿀 수 있습니다.",
    options: [
      "기능주의와 갈등이론",
      "문화자본과 사회재생산",
      "교육 기회와 교육 불평등",
      "젠더와 교육",
      "이주·다문화와 포용교육",
      "디지털 전환과 AI 시대의 교육 격차"
    ]
  },

  // 강의실 (로그인 · 출석 · 과제 파일 제출)
  classroom: {
    title: "🏫 강의실",
    lead: "로그인하면 출석을 체크하고 과제 파일을 제출할 수 있습니다.",
    attendance: {
      enforceTime: true,   // true: 수업일에만 출석 가능 / false: 시간 제한 없이 누를 수 있음(시험용)
      beforeMin: 30,       // 수업 시작 몇 분 전부터 출석 체크가 열리는지
      lateAfterMin: 10     // 수업 시작 후 몇 분이 지나면 지각으로 기록할지
    },
    upload: {
      maxMB: 10,
      accept: ["pdf", "hwp", "hwpx", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "jpg", "jpeg", "png"]
    }
  },

  /*
   * ───── 관리자 · 명단 · 공지 (5단계) ─────
   * 관리자 비밀번호는 원문이 아니라 salt + 해시값으로만 보관합니다.
   * 바꾸는 방법: 관리자 화면의 [설정] 탭에서 변경하거나, make-password-hash.html에서 값을 만들어 아래에 붙여넣으세요.
   */
  admin: {
    salt: "9cdb96687443",
    passwordHash: "21027f44c1846e6f4eaff8b16564aa8d18c114f376e4577ba715bda0c318f2a4"
  },

  // 수강생 명단. restrict가 true면 명단에 있는 학번·이름만 로그인할 수 있습니다.
  roster: { restrict: false, students: [] },

  // 공지사항: { id, title, body, date("YYYY-MM-DD"), pinned }
  notices: [],

  /*
   * ───── 라이브 퀴즈 ─────
   * 서버 없이 PeerJS(WebRTC)로 교수자 브라우저와 학생 휴대폰을 직접 연결합니다.
   *  - 인터넷 연결이 필요하고, 학생이 QR로 입장하려면 사이트를 인터넷에 배포한 주소로 열어야 합니다.
   *  - 교수자 화면은 관리자 로그인(🔓) 후에만 보입니다.
   */
  quiz: {
    title: "🎯 라이브 퀴즈",
    lead: "수업 중 교수자가 방을 열면, 학생은 QR 코드를 촬영하거나 PIN을 입력해 입장하고 실시간으로 문제를 풉니다.",
    peerPrefix: "edusoc-",   // 방 이름 앞에 붙는 글자. 다른 사이트와 겹치지 않게 바꿔 두세요.
    publicUrl: "",           // QR에 담을 사이트 주소. 비우면 지금 열린 주소를 씁니다.
    defaultTime: 20,         // 문제당 기본 제한 시간(초)
    maxPlayers: 80,
    libs: {
      peer: { src: "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js", integrity: "sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR" },
      qr: { src: "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js", integrity: "sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU" }
    },
    // AI 문제 출제. 교수자가 화면에서 본인의 API 키를 입력해 쓰거나, 키 없이 쓰는 프록시 주소(endpoint)를 지정할 수 있습니다.
    ai: { endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-5-5", maxQuestions: 10 },
    // 처음 열 때 들어 있는 예시 문제 (※ 예시)  answer는 0부터 시작하는 정답 번호입니다.
    defaultSet: {
      title: "교육사회학 워밍업 퀴즈 (※ 예시)",
      questions: [
        { q: "교육의 사회화·선발 기능을 강조하는 사회학적 관점은?", options: ["기능주의", "갈등이론", "상징적 상호작용론", "비판이론"], answer: 0, time: 20, explain: "기능주의는 교육이 사회 유지에 필요한 가치 전달과 인재 선발을 맡는다고 봅니다." },
        { q: "부르디외가 교육 불평등의 재생산을 설명하며 제시한 핵심 개념은?", options: ["인간자본", "문화자본", "사회적 지위", "교육 투자"], answer: 1, time: 20, explain: "가정에서 물려받은 문화적 취향·언어 습관 등이 학교에서 유리하게 작용합니다." },
        { q: "공식 교육과정 밖에서 학교생활을 통해 암묵적으로 배우는 규범과 가치를 무엇이라 하는가?", options: ["영 교육과정", "공식 교육과정", "잠재적 교육과정", "방과후 교육과정"], answer: 2, time: 20, explain: "학교의 규칙, 위계, 관행 속에서 학생들이 자연스럽게 학습하는 것입니다." }
      ]
    }
  },

  footer: { text: "Copyright 2026 ⓒ AI WEB, All Rights Reserved. | 김수영(고려대학교 학부대학 원격교육센터)" }
};
