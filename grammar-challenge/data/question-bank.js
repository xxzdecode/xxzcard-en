(function registerGrammarQuestionBank(root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) root.GRAMMAR_QUESTION_BANK = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGrammarQuestionBank() {
  return Object.freeze({
  "schemaVersion": 1,
  "version": "sha256:e1a960fd1dddd4872b613fe86d1b8a9be91b2526f0c0ddd3f6aeb9180c6a96e9",
  "sourceCatalog": "grammar-challenge/data/catalog.js",
  "skippedChallengeIds": [
    "grammar-2026-08-01-adjective-review",
    "grammar-2026-07-31-parts-of-speech-review",
    "grammar-2026-07-22-simple-present-1",
    "grammar-2026-07-17-nouns-uncountable",
    "grammar-2026-07-16-pronouns-be",
    "grammar-2026-07-15-sentence-skeleton"
  ],
  "items": [
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC01",
      "category": "core_review",
      "categoryLabel": "Two maps",
      "type": "single",
      "prompt": "Which group names parts of speech?",
      "options": [
        "noun, verb, adjective, adverb",
        "subject, verb, object",
        "question, answer, example",
        "singular, plural, tense"
      ],
      "answer": "noun, verb, adjective, adverb",
      "answerDisplay": "noun, verb, adjective, adverb",
      "correctFeedback": "Exactly. These words name parts of speech.",
      "wrongFeedback": "Think about the type of each word.",
      "explanation": "A part of speech tells us what kind of word it is.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "parts-of-speech-map"
      ],
      "primaryKpId": "parts-of-speech-map",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:2aa35c34154c62398a91c8cdea7fe35030dcb13bd27bc642ac48a2a89a988ab5",
      "variantGroupId": "parts-of-speech-map::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC02",
      "category": "core_review",
      "categoryLabel": "Adjective",
      "type": "single",
      "source": "The young teacher smiles.",
      "prompt": "What part of speech is young?",
      "options": [
        "adjective",
        "noun",
        "verb",
        "adverb"
      ],
      "answer": "adjective",
      "answerDisplay": "young = adjective",
      "correctFeedback": "Right. Young describes the noun teacher.",
      "wrongFeedback": "Which word describes teacher?",
      "explanation": "An adjective describes a noun.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adjective-basics-suffixes"
      ],
      "primaryKpId": "adjective-basics-suffixes",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4fcf2f7d7032b7a43b50afe3327e61a0f4dc62d3e0da4af66c83dbe3c2de76c6",
      "variantGroupId": "adjective-basics-suffixes::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC03",
      "category": "weakness_review",
      "categoryLabel": "Weakness review | verb phrase",
      "type": "single",
      "source": "Mia can read a story.",
      "prompt": "Which words make the verb phrase?",
      "options": [
        "can read",
        "Mia",
        "a story",
        "read a story"
      ],
      "answer": "can read",
      "answerDisplay": "can read",
      "correctFeedback": "Correct. Can and read work together in the verb phrase.",
      "wrongFeedback": "Keep the modal verb and the main verb together.",
      "explanation": "A modal verb and the base verb form a verb phrase here.",
      "kpId": "sentence-be-action-aux",
      "primaryWeaknessId": "sister.sentence-be-action-aux.modal-can-predicate",
      "weaknessIds": [
        "sister.sentence-be-action-aux.modal-can-predicate"
      ],
      "diagnosticTargets": [
        "modal-can-predicate",
        "modal-plus-base-verb"
      ],
      "contentHash": "sha256:c5e124d26e23d167d267b3ada616f1e70805eb973d36579ab75c39f7ea176210",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "sentence-be-action-aux"
      ],
      "primaryKpId": "sentence-be-action-aux",
      "variantGroupId": "sister.sentence-be-action-aux.modal-can-predicate"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC04",
      "category": "weakness_review",
      "categoryLabel": "Weakness review | subject and object",
      "type": "single",
      "source": "The little rabbit sleeps.",
      "prompt": "Which answer is correct?",
      "options": [
        "The little rabbit is the subject; there is no object.",
        "rabbit is the object.",
        "sleeps is the subject.",
        "Every sentence must have an object."
      ],
      "answer": "The little rabbit is the subject; there is no object.",
      "answerDisplay": "Subject: The little rabbit; object: none.",
      "correctFeedback": "Correct. The whole noun phrase is the subject, and sleeps needs no object here.",
      "wrongFeedback": "Find who sleeps, then decide whether the action needs an object.",
      "explanation": "A sentence can have a complete subject and no object.",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.subject-boundary-no-object-discrimination",
      "weaknessIds": [
        "brother.sentence-parts.subject-boundary-no-object-discrimination"
      ],
      "diagnosticTargets": [
        "complete-subject-boundary",
        "no-object-discrimination"
      ],
      "contentHash": "sha256:02a1c94a39b5e972116b5e443986064837c43e4d498f1958eb2f5e0b5f8b51e9",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.subject-boundary-no-object-discrimination"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC05",
      "category": "core_review",
      "categoryLabel": "Adverb",
      "type": "single",
      "source": "The girl speaks slowly.",
      "prompt": "What does slowly describe?",
      "options": [
        "the verb speaks",
        "the noun girl",
        "the article the",
        "the whole subject"
      ],
      "answer": "the verb speaks",
      "answerDisplay": "slowly describes speaks",
      "correctFeedback": "Yes. Slowly tells us how she speaks.",
      "wrongFeedback": "Ask: How does she speak?",
      "explanation": "An adverb can describe how an action happens.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:157280bb2350f6a9ff7403cb5c870f85a9533bef5c2dc027be9d46869ba4688c",
      "variantGroupId": "adverb-basics-ly::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC06",
      "category": "core_review",
      "categoryLabel": "Noun and object",
      "type": "single",
      "source": "Tom reads books.",
      "prompt": "What are the two labels for books?",
      "options": [
        "noun and object",
        "verb and subject",
        "adjective and object",
        "adverb and object"
      ],
      "answer": "noun and object",
      "answerDisplay": "books = noun + object",
      "correctFeedback": "Correct. Books is a noun and works as the object.",
      "wrongFeedback": "Ask what kind of word books is and what job it does.",
      "explanation": "Part of speech and sentence job are two different labels.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "parts-of-speech-map",
        "noun-types",
        "sentence-parts"
      ],
      "primaryKpId": "parts-of-speech-map",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e2f4942f5ae16949665019ca59882b58d379d6337b7f610e8ae88831d09e2a84",
      "variantGroupId": "parts-of-speech-map::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC07",
      "category": "core_review",
      "categoryLabel": "Noun and subject",
      "type": "single",
      "source": "Birds fly.",
      "prompt": "What are the two labels for Birds?",
      "options": [
        "noun and subject",
        "noun and object",
        "verb and object",
        "adjective and subject"
      ],
      "answer": "noun and subject",
      "answerDisplay": "Birds = noun + subject",
      "correctFeedback": "Correct. Birds is a noun and works as the subject.",
      "wrongFeedback": "Who flies?",
      "explanation": "A noun or noun phrase can work as the subject.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "parts-of-speech-map",
        "noun-types",
        "sentence-parts"
      ],
      "primaryKpId": "parts-of-speech-map",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c6d6a89d53ccb86b1876a15453a43fcf9b322838b152c866cad9a47f56d8c305",
      "variantGroupId": "parts-of-speech-map::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC08",
      "category": "core_review",
      "categoryLabel": "Verb",
      "type": "single",
      "source": "The soup is hot.",
      "prompt": "Which word is the verb?",
      "options": [
        "is",
        "soup",
        "hot",
        "the"
      ],
      "answer": "is",
      "answerDisplay": "is = verb",
      "correctFeedback": "Correct. Is is the verb in this sentence.",
      "wrongFeedback": "Find the word that links the subject to its state.",
      "explanation": "Be is a verb, even when there is no action.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "sentence-be-action-aux"
      ],
      "primaryKpId": "sentence-be-action-aux",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:b0b257d50117cbbb8af88b036b2cbd086eb85d1f2c737b558a910af0ae7579de",
      "variantGroupId": "sentence-be-action-aux::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC09",
      "category": "core_review",
      "categoryLabel": "Two labels",
      "type": "single",
      "prompt": "Why can boy be both a noun and a subject?",
      "options": [
        "Noun is its type; subject is its job in the sentence.",
        "Every noun is always a subject.",
        "Subject is another name for noun.",
        "The word changes its spelling."
      ],
      "answer": "Noun is its type; subject is its job in the sentence.",
      "answerDisplay": "type: noun; job: subject",
      "correctFeedback": "Exactly. One label tells the type; the other tells the job.",
      "wrongFeedback": "Keep the two maps separate.",
      "explanation": "A word can have a part-of-speech label and a sentence-job label at the same time.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "parts-of-speech-map"
      ],
      "primaryKpId": "parts-of-speech-map",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e0c8dc71187fa69c07c0d1dd2849ca4bb62a29c0ebca763c0f4dbfc083646e5d",
      "variantGroupId": "parts-of-speech-map::core_review"
    },
    {
      "id": "grammar-2026-08-28-parts-of-speech-review::GC10",
      "category": "core_review",
      "categoryLabel": "Sentence jobs",
      "type": "single",
      "prompt": "Which group gives the everyday SVO map?",
      "options": [
        "subject, verb, object",
        "noun, adjective, adverb",
        "singular, plural, tense",
        "word, phrase, sentence"
      ],
      "answer": "subject, verb, object",
      "answerDisplay": "subject, verb, object",
      "correctFeedback": "Correct. This is the everyday SVO map.",
      "wrongFeedback": "Look for subject, verb and object.",
      "explanation": "SVO means subject, verb and object.",
      "bankItemId": "grammar-2026-08-28-parts-of-speech-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-28-parts-of-speech-review",
      "sourceChallengeDate": "2026-08-28",
      "sourceChallengeTitle": "词性与句子成分英语标签复习挑战",
      "sourceLessonKey": "parts-of-speech-map",
      "sourceLessonKpIds": [
        "parts-of-speech-map",
        "sentence-parts",
        "sentence-be-action-aux",
        "noun-types",
        "adjective-basics-suffixes",
        "adverb-basics-ly"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:73aeb2802a934be3dc61c444d1a678c52bf3b6f59117b4f102a85561f17b40ec",
      "variantGroupId": "sentence-parts::core_review"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC01",
      "category": "cardinal",
      "categoryLabel": "基数词｜数量",
      "type": "single",
      "source": "There are ___ apples.",
      "prompt": "有 12 个苹果，选择正确答案。",
      "options": [
        "twelve",
        "twelfth",
        "twelveth",
        "two"
      ],
      "answer": "twelve",
      "answerDisplay": "There are twelve apples.",
      "correctFeedback": "正确。twelve 表示数量 12。",
      "wrongFeedback": "这里回答有多少个，用基数词。",
      "explanation": "基数词表示数量。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e2389f264c81e32316fdc2511d16822de5fe428ca280eaaa8b6a14c6a89e3373",
      "variantGroupId": "cardinal-ordinal-numbers-basics::cardinal"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC02",
      "category": "cardinal",
      "categoryLabel": "基数词｜20",
      "type": "single",
      "prompt": "数字 20 的英文是？",
      "options": [
        "twenty",
        "twentieth",
        "twelve",
        "thirty"
      ],
      "answer": "twenty",
      "answerDisplay": "20 = twenty",
      "correctFeedback": "正确。twenty 是基数词。",
      "wrongFeedback": "不要把 20 和第 20 混在一起。",
      "explanation": "twenty 表示数量 20。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d5ce1be63b5e18470b193a4868cc1d6f3e9431bd62f43c6016ea476a354dc18f",
      "variantGroupId": "cardinal-ordinal-numbers-basics::cardinal"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC03",
      "category": "weakness_review",
      "categoryLabel": "薄弱项复测｜时间补充信息",
      "type": "single",
      "source": "The trip starts on May fifth.",
      "prompt": "哪一部分是补充什么时候的时间信息？",
      "options": [
        "on May fifth",
        "The trip",
        "starts",
        "May"
      ],
      "answer": "on May fifth",
      "answerDisplay": "on May fifth",
      "correctFeedback": "正确。on May fifth 补充说明旅行什么时候开始。",
      "wrongFeedback": "找回答什么时候的完整部分。",
      "explanation": "时间短语是句子的补充信息。",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.time-adjunct",
      "weaknessIds": [
        "brother.sentence-parts.time-adjunct"
      ],
      "diagnosticTargets": [
        "time-adjunct",
        "date-phrase-as-time-information"
      ],
      "contentHash": "sha256:ac975c77a0667967894dda97c73ca04583218c6501dfaf41cfa6099513f2b89e",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.time-adjunct"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC04",
      "category": "weakness_review",
      "categoryLabel": "薄弱项复测｜专有名词大写",
      "type": "single",
      "source": "Tom is twelve years old.",
      "prompt": "哪个词是专有名词，首字母必须大写？",
      "options": [
        "Tom",
        "twelve",
        "years",
        "old"
      ],
      "answer": "Tom",
      "answerDisplay": "Tom",
      "correctFeedback": "正确。Tom 是人名，首字母大写。",
      "wrongFeedback": "找句子中的人名。",
      "explanation": "人名是专有名词，首字母要大写。",
      "kpId": "noun-types",
      "primaryWeaknessId": "brother.noun-types.proper-noun-capitalization",
      "weaknessIds": [
        "brother.noun-types.proper-noun-capitalization"
      ],
      "diagnosticTargets": [
        "proper-noun-capitalization",
        "person-name-capital-letter"
      ],
      "contentHash": "sha256:51352c143c0e12656079ecade3a7a9f2c5dc9d9b58356836efd4cf2bbb251dcf",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "noun-types"
      ],
      "primaryKpId": "noun-types",
      "variantGroupId": "brother.noun-types.proper-noun-capitalization"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC05",
      "category": "ordinal",
      "categoryLabel": "序数词｜第一个",
      "type": "single",
      "source": "Lily is the ___ runner in line.",
      "prompt": "Lily 排第一，选择正确答案。",
      "options": [
        "first",
        "one",
        "second",
        "three"
      ],
      "answer": "first",
      "answerDisplay": "Lily is the first runner in line.",
      "correctFeedback": "正确。first 表示第一。",
      "wrongFeedback": "这里回答第几个，用序数词。",
      "explanation": "one 对应 first。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9607b60a1c6920c2c10531fee7a960666440fe2d682d22c59b776a6bacd936df",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC06",
      "category": "ordinal",
      "categoryLabel": "序数词｜第三个",
      "type": "single",
      "prompt": "three 对应的序数词是？",
      "options": [
        "third",
        "three",
        "threeth",
        "thirtieth"
      ],
      "answer": "third",
      "answerDisplay": "three → third",
      "correctFeedback": "正确。three 的序数词是不规则形式 third。",
      "wrongFeedback": "third 是需要单独记住的形式。",
      "explanation": "three → third。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:924b0fb0b40db9917d69b0c87764f14d2e013356fee32add725fe9bb1c1b1c47",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC07",
      "category": "ordinal",
      "categoryLabel": "序数词｜第五个",
      "type": "single",
      "prompt": "five 对应的序数词是？",
      "options": [
        "fifth",
        "five",
        "fiveth",
        "fiftieth"
      ],
      "answer": "fifth",
      "answerDisplay": "five → fifth",
      "correctFeedback": "正确。five 变成 fifth。",
      "wrongFeedback": "注意 fifth 的拼写。",
      "explanation": "five → fifth。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:93072f50ba02f029e3f45f0203e04aadfaaebfc7b686d735dcb0114a376faa11",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC08",
      "category": "cardinal",
      "categoryLabel": "基数词与序数词辨析",
      "type": "single",
      "prompt": "哪一组是数量词和对应的顺序词？",
      "options": [
        "two / second",
        "two / twelve",
        "second / third",
        "five / twenty"
      ],
      "answer": "two / second",
      "answerDisplay": "two / second",
      "correctFeedback": "正确。two 表示 2，second 表示第 2。",
      "wrongFeedback": "找同一个数字的基数词和序数词。",
      "explanation": "two → second。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c1d9b32dca9f4baf1ed2c703e62627c63cfa42ef0db11fcea1846480c5f64ad7",
      "variantGroupId": "cardinal-ordinal-numbers-basics::cardinal"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC09",
      "category": "date_order",
      "categoryLabel": "日期｜May fifth",
      "type": "single",
      "prompt": "May 5 读作？",
      "options": [
        "May fifth",
        "May five",
        "the five May",
        "fifth May five"
      ],
      "answer": "May fifth",
      "answerDisplay": "May fifth",
      "correctFeedback": "正确。日期中的日使用序数词 fifth。",
      "wrongFeedback": "月份后面的日期要读序数词。",
      "explanation": "May 5 → May fifth。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:00e7d6b2d8d345032c8681b15fdad13d82a012e2871cbc51f329fb4f7fdeb0cf",
      "variantGroupId": "cardinal-ordinal-numbers-basics::date_order"
    },
    {
      "id": "grammar-2026-08-27-cardinal-ordinal-review::GC10",
      "category": "date_order",
      "categoryLabel": "顺序｜第十二层",
      "type": "single",
      "source": "Our classroom is on the ___ floor.",
      "prompt": "教室在第十二层，选择正确答案。",
      "options": [
        "twelfth",
        "twelve",
        "twentieth",
        "second"
      ],
      "answer": "twelfth",
      "answerDisplay": "Our classroom is on the twelfth floor.",
      "correctFeedback": "正确。twelfth 表示第十二。",
      "wrongFeedback": "楼层回答第几层，用序数词。",
      "explanation": "twelve → twelfth。",
      "bankItemId": "grammar-2026-08-27-cardinal-ordinal-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-27-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-27",
      "sourceChallengeTitle": "基数词与序数词基础复习挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics",
        "sentence-parts",
        "noun-types"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:819d733622128b0c59fe4cbf1b95832f394dc80e1d9ffb255cb8581433334ebe",
      "variantGroupId": "cardinal-ordinal-numbers-basics::date_order"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC01",
      "category": "action_manner",
      "categoryLabel": "动作怎样发生",
      "type": "single",
      "prompt": "The rabbit runs ___.",
      "options": [
        "quickly",
        "quick",
        "quicker",
        "quickness"
      ],
      "answer": "quickly",
      "answerDisplay": "quickly",
      "correctFeedback": "正确。quickly 说明 runs 怎样发生。",
      "wrongFeedback": "quickly 说明 runs 怎样发生。",
      "explanation": "quickly 说明 runs 怎样发生。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:bcc45901a2ce507e295e81e0e98b53b955d910119540fe8168db24ee1946d0aa",
      "variantGroupId": "adverb-basics-ly::action_manner"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC02",
      "category": "action_manner",
      "categoryLabel": "有宾语时的位置",
      "type": "single",
      "prompt": "Mia reads the story ___.",
      "options": [
        "carefully",
        "careful",
        "care",
        "carefulness"
      ],
      "answer": "carefully",
      "answerDisplay": "carefully",
      "correctFeedback": "正确。有宾语时，本阶段把方式副词放在宾语后。",
      "wrongFeedback": "有宾语时，本阶段把方式副词放在宾语后。",
      "explanation": "有宾语时，本阶段把方式副词放在宾语后。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:25fb5e16157c9104a1efb927b10868ac9e452b92eb86ff70d85be52e6ecaa47a",
      "variantGroupId": "adverb-basics-ly::action_manner"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC03",
      "category": "action_manner",
      "categoryLabel": "动词后的方式副词",
      "type": "single",
      "prompt": "The baby sleeps ___.",
      "options": [
        "quietly",
        "quiet",
        "quieter",
        "quietness"
      ],
      "answer": "quietly",
      "answerDisplay": "quietly",
      "correctFeedback": "正确。quietly 说明 sleeps 怎样发生。",
      "wrongFeedback": "quietly 说明 sleeps 怎样发生。",
      "explanation": "quietly 说明 sleeps 怎样发生。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:dd06f77154e73eba436adeac54b4456997b2b9789886399e3a5e04421f1f6509",
      "variantGroupId": "adverb-basics-ly::action_manner"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC04",
      "category": "form",
      "categoryLabel": "y 变 i 再加-ly",
      "type": "single",
      "prompt": "happy 的方式副词形式是？",
      "options": [
        "happily",
        "happyly",
        "happier",
        "happy"
      ],
      "answer": "happily",
      "answerDisplay": "happily",
      "correctFeedback": "正确。happy 变 y 为 i，再加 -ly。",
      "wrongFeedback": "happy 变 y 为 i，再加 -ly。",
      "explanation": "happy 变 y 为 i，再加 -ly。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d8939243b7b71fb460d73e7ac7f29efcb76d495037ebfa69171972bfc3f0a944",
      "variantGroupId": "adverb-basics-ly::form"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC05",
      "category": "form",
      "categoryLabel": "good 的特殊形式",
      "type": "single",
      "prompt": "She is a good singer. She sings ___.",
      "options": [
        "well",
        "good",
        "goodly",
        "better"
      ],
      "answer": "well",
      "answerDisplay": "well",
      "correctFeedback": "正确。good 描述人，well 描述 sings。",
      "wrongFeedback": "good 描述人，well 描述 sings。",
      "explanation": "good 描述人，well 描述 sings。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:21545c2dcb812bc7d3b20ae512be3bfc32b9850dbbefd1efccb2e773fe72e253",
      "variantGroupId": "adverb-basics-ly::form"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC06",
      "category": "contrast",
      "categoryLabel": "同形副词",
      "type": "single",
      "prompt": "The train moves ___.",
      "options": [
        "fast",
        "fastly",
        "fasterly",
        "fastness"
      ],
      "answer": "fast",
      "answerDisplay": "fast",
      "correctFeedback": "正确。fast 作方式副词时保持原形。",
      "wrongFeedback": "fast 作方式副词时保持原形。",
      "explanation": "fast 作方式副词时保持原形。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4ad5f125cf8541e2aed5c33fddfaaa55d4e92c9168b7347337c00887c76a0218",
      "variantGroupId": "adverb-basics-ly::contrast"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC07",
      "category": "contrast",
      "categoryLabel": "-ly 不是绝对",
      "type": "single",
      "prompt": "Which word is an adjective here: a ___ girl?",
      "options": [
        "friendly",
        "carefully",
        "quickly",
        "happily"
      ],
      "answer": "friendly",
      "answerDisplay": "friendly",
      "correctFeedback": "正确。friendly 虽以 -ly 结尾，仍常作形容词。",
      "wrongFeedback": "friendly 虽以 -ly 结尾，仍常作形容词。",
      "explanation": "friendly 虽以 -ly 结尾，仍常作形容词。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:095e069f93377749426770a5a133a342e49bc797e3b35913fe910efad1b912ee",
      "variantGroupId": "adverb-basics-ly::contrast"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC08",
      "category": "position",
      "categoryLabel": "方式副词位置",
      "type": "single",
      "prompt": "Choose the correct sentence.",
      "options": [
        "Leo opens the box carefully.",
        "Leo carefully the box opens.",
        "Leo opens carefully the box.",
        "Leo the box carefully opens."
      ],
      "answer": "Leo opens the box carefully.",
      "answerDisplay": "Leo opens the box carefully.",
      "correctFeedback": "正确。有宾语 the box 时，本阶段把 carefully 放在宾语后。",
      "wrongFeedback": "有宾语 the box 时，本阶段把 carefully 放在宾语后。",
      "explanation": "有宾语 the box 时，本阶段把 carefully 放在宾语后。",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:509726baeb1cc1cd646e7635df97ecde498a8ea75c0efb4c78333e7a0d2ab114",
      "variantGroupId": "adverb-basics-ly::position"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC09",
      "category": "weakness_review",
      "categoryLabel": "薄弱项复测｜时间补充信息",
      "type": "single",
      "prompt": "哪一部分是时间补充信息？",
      "options": [
        "after school",
        "Mia",
        "packs",
        "her bag"
      ],
      "answer": "after school",
      "answerDisplay": "after school",
      "correctFeedback": "正确。after school 说明动作何时发生，是时间补充信息。",
      "wrongFeedback": "after school 说明动作何时发生，是时间补充信息。",
      "explanation": "after school 说明动作何时发生，是时间补充信息。",
      "source": "Mia packs her bag carefully after school.",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.time-adjunct",
      "weaknessIds": [
        "brother.sentence-parts.time-adjunct"
      ],
      "diagnosticTargets": [
        "time-adjunct",
        "separate-core-from-time-information"
      ],
      "contentHash": "sha256:8a95478bd0a1cfe02d38d0d582bef4be05e461877bde6742cf8ee1a25b215083",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.time-adjunct"
    },
    {
      "id": "grammar-2026-08-26-adverb-review::GC10",
      "category": "weakness_review",
      "categoryLabel": "薄弱项复测｜重复时间标志",
      "type": "single",
      "prompt": "哪一部分表示重复发生的时间？",
      "options": [
        "every night",
        "Leo",
        "reads",
        "quietly"
      ],
      "answer": "every night",
      "answerDisplay": "every night",
      "correctFeedback": "正确。every night 是一般现在时的重复时间标志。",
      "wrongFeedback": "every night 是一般现在时的重复时间标志。",
      "explanation": "every night 是一般现在时的重复时间标志。",
      "source": "Leo reads quietly every night.",
      "kpId": "simple-present-use",
      "primaryWeaknessId": "brother.simple-present-use.frequency-time-markers",
      "weaknessIds": [
        "brother.simple-present-use.frequency-time-markers"
      ],
      "diagnosticTargets": [
        "frequency-time-markers",
        "repeated-time-marker"
      ],
      "contentHash": "sha256:e3363b4430a83e8d5ae1fae3a6ced6bce2cdb4302647b789d43dfd21e9f440c1",
      "bankItemId": "grammar-2026-08-26-adverb-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-26-adverb-review",
      "sourceChallengeDate": "2026-08-26",
      "sourceChallengeTitle": "方式副词与 -ly 线索复习挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly",
        "sentence-parts",
        "simple-present-use"
      ],
      "kpIds": [
        "simple-present-use"
      ],
      "primaryKpId": "simple-present-use",
      "variantGroupId": "brother.simple-present-use.frequency-time-markers"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC01",
      "category": "contact",
      "categoryLabel": "接触表面｜on",
      "type": "single",
      "prompt": "The cup is ___ the table.",
      "options": [
        "on",
        "over",
        "above",
        "below"
      ],
      "answer": "on",
      "answerDisplay": "on",
      "correctFeedback": "正确。杯子接触桌面，用 on。",
      "wrongFeedback": "杯子接触桌面，用 on。",
      "explanation": "杯子接触桌面，用 on。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:bed1a67416820f0f13e22577b629c83f7d8ddd34807e5ef584d00f62bda989a6",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contact"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC02",
      "category": "contact",
      "categoryLabel": "接触表面｜on",
      "type": "single",
      "prompt": "Which sentence shows contact?",
      "options": [
        "The picture is on the wall.",
        "The bird is above the wall.",
        "The lamp is over the desk.",
        "The cat is under the chair."
      ],
      "answer": "The picture is on the wall.",
      "answerDisplay": "The picture is on the wall.",
      "correctFeedback": "正确。on 表示接触表面。",
      "wrongFeedback": "on 表示接触表面。",
      "explanation": "on 表示接触表面。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8935486a7c2801ddbfb2bd9dc8a3b0106db4eccad8393ea78333c744c38a855e",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contact"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC03",
      "category": "upper",
      "categoryLabel": "正上方｜over",
      "type": "single",
      "prompt": "A bridge goes ___ the river.",
      "options": [
        "over",
        "on",
        "below",
        "under"
      ],
      "answer": "over",
      "answerDisplay": "over",
      "correctFeedback": "正确。桥横跨河流，用 over。",
      "wrongFeedback": "桥横跨河流，用 over。",
      "explanation": "桥横跨河流，用 over。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4145d452f97200c20519c03fc187cd70a280896533092ab5e7b053f527c2ed1f",
      "variantGroupId": "place-prepositions-on-over-above-under-below::upper"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC04",
      "category": "upper",
      "categoryLabel": "只比较更高｜above",
      "type": "single",
      "prompt": "The kite is high in the sky, ___ the trees.",
      "options": [
        "above",
        "on",
        "under",
        "below"
      ],
      "answer": "above",
      "answerDisplay": "above",
      "correctFeedback": "正确。风筝比树更高，不强调正对，用 above。",
      "wrongFeedback": "风筝比树更高，不强调正对，用 above。",
      "explanation": "风筝比树更高，不强调正对，用 above。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e2fb967f6be467be2e3137a54c82a17d8dc1e3ae4c249cdf1cd532d11c2ee015",
      "variantGroupId": "place-prepositions-on-over-above-under-below::upper"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC05",
      "category": "lower",
      "categoryLabel": "正下方或遮盖｜under",
      "type": "single",
      "prompt": "The shoes are ___ the bed.",
      "options": [
        "under",
        "below",
        "over",
        "on"
      ],
      "answer": "under",
      "answerDisplay": "under",
      "correctFeedback": "正确。鞋在床的正下方或床的遮盖下，用 under。",
      "wrongFeedback": "鞋在床的正下方或床的遮盖下，用 under。",
      "explanation": "鞋在床的正下方或床的遮盖下，用 under。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:a703995204705afe7637806e8699b21833ecef2a71171e2ff2df1fa473513bb4",
      "variantGroupId": "place-prepositions-on-over-above-under-below::lower"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC06",
      "category": "lower",
      "categoryLabel": "只比较更低｜below",
      "type": "single",
      "prompt": "Write your answer ___ the line.",
      "options": [
        "below",
        "under",
        "above",
        "on"
      ],
      "answer": "below",
      "answerDisplay": "below",
      "correctFeedback": "正确。答案写在线的下方，不强调遮盖，用 below。",
      "wrongFeedback": "答案写在线的下方，不强调遮盖，用 below。",
      "explanation": "答案写在线的下方，不强调遮盖，用 below。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:a2254e27578061c8d656e1f02c88bb42e2578d7c87a2cc1cdd1632583fc65131",
      "variantGroupId": "place-prepositions-on-over-above-under-below::lower"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC07",
      "category": "contrast",
      "categoryLabel": "over 与 above",
      "type": "single",
      "prompt": "Which pair is correct?",
      "options": [
        "over = directly higher; above = simply higher",
        "over = touching; above = covering",
        "over = lower; above = higher",
        "over = inside; above = outside"
      ],
      "answer": "over = directly higher; above = simply higher",
      "answerDisplay": "over = directly higher; above = simply higher",
      "correctFeedback": "正确。over 常强调正上或横跨，above 只比较高低。",
      "wrongFeedback": "over 常强调正上或横跨，above 只比较高低。",
      "explanation": "over 常强调正上或横跨，above 只比较高低。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4698cf4ac7c0e9aa83e1d0f9c1be2bbfa9367155599e2efaaa55a5f8c2373a56",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contrast"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC08",
      "category": "contrast",
      "categoryLabel": "under 与 below",
      "type": "single",
      "prompt": "Which sentence best shows something hidden by another object?",
      "options": [
        "The kitten is under the blanket.",
        "The number is below the line.",
        "The bird is above the tree.",
        "The book is on the desk."
      ],
      "answer": "The kitten is under the blanket.",
      "answerDisplay": "The kitten is under the blanket.",
      "correctFeedback": "正确。under 可表示在遮盖之下。",
      "wrongFeedback": "under 可表示在遮盖之下。",
      "explanation": "under 可表示在遮盖之下。",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:78828212f4a7511e956c65f57e5475706c1f5076b8e0ca4a14a6a7236cdc8ca0",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contrast"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC09",
      "category": "weakness_review",
      "categoryLabel": "薄弱项复测｜完整主语与无宾语",
      "type": "single",
      "prompt": "完整主语是什么？这个句子有宾语吗？",
      "options": [
        "The small lamp；没有宾语",
        "The；desk",
        "lamp；the desk",
        "The small；有宾语"
      ],
      "answer": "The small lamp；没有宾语",
      "answerDisplay": "The small lamp；没有宾语",
      "correctFeedback": "正确。The small lamp 是完整主语；is above the desk 描述位置，句中没有宾语。",
      "wrongFeedback": "The small lamp 是完整主语；is above the desk 描述位置，句中没有宾语。",
      "explanation": "The small lamp 是完整主语；is above the desk 描述位置，句中没有宾语。",
      "source": "The small lamp is above the desk.",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.subject-boundary-no-object-discrimination",
      "weaknessIds": [
        "brother.sentence-parts.subject-boundary-no-object-discrimination"
      ],
      "diagnosticTargets": [
        "subject-boundary-no-object-discrimination",
        "complete-subject",
        "no-object"
      ],
      "contentHash": "sha256:e5d0ce73f6cf38169ebc00f02cadb94daea13608c4d3a0aee4f24f44f76731ae",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.subject-boundary-no-object-discrimination"
    },
    {
      "id": "grammar-2026-08-25-place-prepositions-review::GC10",
      "category": "weakness_review",
      "categoryLabel": "薄弱项复测｜完整主语与无宾语",
      "type": "single",
      "prompt": "完整主语是什么？这个句子有宾语吗？",
      "options": [
        "The two birds；没有宾语",
        "The；trees",
        "birds；the trees",
        "The two；有宾语"
      ],
      "answer": "The two birds；没有宾语",
      "answerDisplay": "The two birds；没有宾语",
      "correctFeedback": "正确。The two birds 是完整主语；are above the trees 描述位置，句中没有宾语。",
      "wrongFeedback": "The two birds 是完整主语；are above the trees 描述位置，句中没有宾语。",
      "explanation": "The two birds 是完整主语；are above the trees 描述位置，句中没有宾语。",
      "source": "The two birds are above the trees.",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.subject-boundary-no-object-discrimination",
      "weaknessIds": [
        "brother.sentence-parts.subject-boundary-no-object-discrimination"
      ],
      "diagnosticTargets": [
        "subject-boundary-no-object-discrimination",
        "plural-complete-subject",
        "no-object"
      ],
      "contentHash": "sha256:962215ae0d5bd0cdb7e53d5f3c23528128dfca33c1c73f489371ccb816de25f9",
      "bankItemId": "grammar-2026-08-25-place-prepositions-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-25-place-prepositions-review",
      "sourceChallengeDate": "2026-08-25",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.subject-boundary-no-object-discrimination"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC01",
      "category": "why_because",
      "categoryLabel": "Why 问原因",
      "type": "single",
      "source": "Why is Nina smiling?",
      "prompt": "选择最合适的回答。",
      "options": [
        "Because she finds her key.",
        "She is in the garden.",
        "It is Tuesday.",
        "Nina is my friend."
      ],
      "answer": "Because she finds her key.",
      "answerDisplay": "Because she finds her key.",
      "correctFeedback": "正确。Because 后面给出原因。",
      "wrongFeedback": "Why 问原因。",
      "explanation": "Why ...? 常用 Because ... 回答。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:b317ef5af4f284f2ec886c49ec72a19728f755a921d2902d806761ecf657b39f",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::why_because"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC02",
      "category": "why_because",
      "categoryLabel": "识别原因",
      "type": "single",
      "source": "The class is quiet because the teacher is speaking.",
      "prompt": "哪一部分是原因？",
      "options": [
        "the teacher is speaking",
        "The class is quiet",
        "The class",
        "quiet"
      ],
      "answer": "the teacher is speaking",
      "answerDisplay": "the teacher is speaking",
      "correctFeedback": "正确。because 后面是原因。",
      "wrongFeedback": "先找到 because。",
      "explanation": "because 引出原因。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:834c30ce032a211a2669593aea44f872c87ec45e51425382072f706e5f6f0d9c",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::why_because"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC03",
      "category": "why_because",
      "categoryLabel": "薄弱项复测｜特殊疑问句",
      "type": "single",
      "source": "Leo stays inside because it is raining.",
      "prompt": "哪一个问句正确询问 Leo 待在室内的原因？",
      "options": [
        "Why does Leo stay inside?",
        "Why Leo stays inside?",
        "Where does Leo stay inside?",
        "Why does Leo stays inside?"
      ],
      "answer": "Why does Leo stay inside?",
      "answerDisplay": "Why does Leo stay inside?",
      "correctFeedback": "正确。Why + does + 主语 + 动词原形。",
      "wrongFeedback": "先选 Why，再检查 does 后面的动词原形。",
      "explanation": "特殊疑问句使用 Why does Leo stay ...?",
      "kpId": "wh-question-method",
      "primaryWeaknessId": "brother.wh-question-method.wh-word-question-formation",
      "weaknessIds": [
        "brother.wh-question-method.wh-word-question-formation"
      ],
      "diagnosticTargets": [
        "why-question-selection",
        "does-question-order",
        "base-verb-after-does"
      ],
      "contentHash": "sha256:fabf8211f2ac384032dc767d975881feb24cde578336381b21acef3efcc7a100",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "wh-question-method"
      ],
      "primaryKpId": "wh-question-method",
      "variantGroupId": "brother.wh-question-method.wh-word-question-formation"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC04",
      "category": "because",
      "categoryLabel": "薄弱项复测｜does 问句",
      "type": "single",
      "source": "Why ___ Amy walk to school?",
      "prompt": "选择正确的助动词。",
      "options": [
        "does",
        "do",
        "is",
        "are"
      ],
      "answer": "does",
      "answerDisplay": "Why does Amy walk to school?",
      "correctFeedback": "正确。Amy 是第三人称单数，问句用 does。",
      "wrongFeedback": "先看主语 Amy，再选助动词。",
      "explanation": "does 后面使用动词原形 walk。",
      "kpId": "simple-present-negative-question",
      "primaryWeaknessId": "brother.simple-present-negative-question.do-does-negative-question-formation",
      "weaknessIds": [
        "brother.simple-present-negative-question.do-does-negative-question-formation"
      ],
      "diagnosticTargets": [
        "does-question-order",
        "third-person-singular-helper",
        "base-verb-after-does"
      ],
      "contentHash": "sha256:18e61b8218dbbc301b5638ce4ab34f84c70e4fb6ddfe23ce0a575386255a9569",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-negative-question",
      "variantGroupId": "brother.simple-present-negative-question.do-does-negative-question-formation"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC05",
      "category": "because",
      "categoryLabel": "because 引出原因",
      "type": "single",
      "source": "Mia opens the window ___ the room is hot.",
      "prompt": "选择正确答案。",
      "options": [
        "because",
        "so",
        "why",
        "but"
      ],
      "answer": "because",
      "answerDisplay": "Mia opens the window because the room is hot.",
      "correctFeedback": "正确。房间热是开窗的原因。",
      "wrongFeedback": "后半句回答“为什么开窗”。",
      "explanation": "结果 + because + 原因。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:0f1c075a548e58e197f5457fea7a73ec255f350ca6eccc573980fa3d5df98f84",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::because"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC06",
      "category": "so",
      "categoryLabel": "so 引出结果",
      "type": "single",
      "source": "The floor is wet, ___ we walk slowly.",
      "prompt": "选择正确答案。",
      "options": [
        "so",
        "because",
        "why",
        "although"
      ],
      "answer": "so",
      "answerDisplay": "The floor is wet, so we walk slowly.",
      "correctFeedback": "正确。走慢一点是结果。",
      "wrongFeedback": "后半句说明后来发生什么。",
      "explanation": "原因 + so + 结果。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:bb12bda92f4be0c023e668d15c78990c2e3a596f01c7ecf7234cb0332c24d9e3",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::so"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC07",
      "category": "so",
      "categoryLabel": "识别结果",
      "type": "single",
      "source": "Ella is hungry, so she makes a sandwich.",
      "prompt": "哪一部分是结果？",
      "options": [
        "she makes a sandwich",
        "Ella is hungry",
        "hungry",
        "Ella"
      ],
      "answer": "she makes a sandwich",
      "answerDisplay": "she makes a sandwich",
      "correctFeedback": "正确。so 后面是结果。",
      "wrongFeedback": "先找到 so。",
      "explanation": "so 引出结果。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:0954f32354d53f15090dd20f8b14e6a058b6f09f7eb486da280b95d72347f63e",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::so"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC08",
      "category": "so",
      "categoryLabel": "同义表达",
      "type": "single",
      "source": "We wear coats because it is cold.",
      "prompt": "换成 so 结构，哪一句正确？",
      "options": [
        "It is cold, so we wear coats.",
        "We wear coats, so it is cold.",
        "Because it is cold, so we wear coats.",
        "Why it is cold, so we wear coats."
      ],
      "answer": "It is cold, so we wear coats.",
      "answerDisplay": "It is cold, so we wear coats.",
      "correctFeedback": "正确。原因在前，so 后接结果。",
      "wrongFeedback": "保持“冷导致穿外套”的方向。",
      "explanation": "because 与 so 可以从不同方向表达同一因果。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:bb3b3bc93d91de7b0420f88eff21bee8ea7142bcdc4da20fd0f936fc3f3c520d",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::so"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC09",
      "category": "no_double",
      "categoryLabel": "不并用",
      "type": "single",
      "prompt": "哪一句需要改正？",
      "options": [
        "Because the bus is late, so we walk.",
        "We walk because the bus is late.",
        "The bus is late, so we walk.",
        "Why do we walk? Because the bus is late."
      ],
      "answer": "Because the bus is late, so we walk.",
      "answerDisplay": "Because the bus is late, so we walk.",
      "correctFeedback": "正确。这一句重复使用 because 与 so。",
      "wrongFeedback": "找同一句中两个因果连接词都出现的句子。",
      "explanation": "基础阶段 because 与 so 二选一。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:a024674c234889f9231211edccdf9974a623ff2f4c7951a371267a0b37d7cf58",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::no_double"
    },
    {
      "id": "grammar-2026-08-24-why-because-so-review::GC10",
      "category": "no_double",
      "categoryLabel": "判断步骤",
      "type": "single",
      "prompt": "判断 because 与 so 的最佳方法是什么？",
      "options": [
        "先分原因和结果，再选连接方向，最后检查不并用。",
        "同时写 because 和 so。",
        "只看哪个词更短。",
        "所有 Why 都用 so 回答。"
      ],
      "answer": "先分原因和结果，再选连接方向，最后检查不并用。",
      "answerDisplay": "分原因结果 → 选方向 → 检查不并用",
      "correctFeedback": "正确。先读懂关系。",
      "wrongFeedback": "不要只靠中文词序。",
      "explanation": "因果关系三步法。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:ce253ff22a39be96a3b92346ff2da70b87aa195ae1cadeb763beee8dc49bd336",
      "bankItemId": "grammar-2026-08-24-why-because-so-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-24-why-because-so-review",
      "sourceChallengeDate": "2026-08-24",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "wh-question-method",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "variantGroupId": "why-because-so::no_double"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC01",
      "category": "identify",
      "categoryLabel": "识别关系",
      "type": "single",
      "source": "The box is old. It is useful.",
      "prompt": "哪一个词最适合连接这两个方向不同的信息？",
      "options": [
        "but",
        "because",
        "so",
        "and"
      ],
      "answer": "but",
      "answerDisplay": "The box is old, but it is useful.",
      "correctFeedback": "正确。old 与 useful 形成转折。",
      "wrongFeedback": "这里不是原因或结果关系。",
      "explanation": "but 连接两个方向不同的信息。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:03f845d4623bfdcac80ec0ed21c1bfa102682751ff040dd49491d1b96afc5752",
      "bankItemId": "grammar-2026-08-23-although-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::identify"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC02",
      "category": "identify",
      "categoryLabel": "识别 although",
      "type": "single",
      "prompt": "哪一句表示“虽然很冷，我们仍然出去”？",
      "options": [
        "Although it is cold, we go outside.",
        "It is cold because we go outside.",
        "It is cold, so we go outside.",
        "Why is it cold?"
      ],
      "answer": "Although it is cold, we go outside.",
      "answerDisplay": "Although it is cold, we go outside.",
      "correctFeedback": "正确。Although 引出先承认的事实。",
      "wrongFeedback": "找以 Although 开头的让步句。",
      "explanation": "Although A, B.",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:31df134c5534bb5919b4774f6cb55e99b2bb497791fb55a522eb3f43225e29bb",
      "bankItemId": "grammar-2026-08-23-although-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::identify"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC03",
      "category": "although",
      "categoryLabel": "薄弱项复测｜状态谓语",
      "type": "single",
      "source": "Although the soup is hot, Ben finishes it.",
      "prompt": "哪一部分共同说明 soup 的状态？",
      "options": [
        "is hot",
        "the soup",
        "hot Ben",
        "finishes it"
      ],
      "answer": "is hot",
      "answerDisplay": "is hot",
      "correctFeedback": "正确。is 与 hot 一起表达状态。",
      "wrongFeedback": "不要只找 is；状态词 hot 也属于完整谓语。",
      "explanation": "be 动词与形容词共同构成状态谓语。",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.copular-predicate",
      "weaknessIds": [
        "brother.sentence-parts.copular-predicate"
      ],
      "diagnosticTargets": [
        "copular-predicate",
        "be-plus-adjective-state-predicate"
      ],
      "contentHash": "sha256:60d000b55bef44d7b4ad62e807cfd0db823c97d20220abd7654a7dd12e2b4222",
      "bankItemId": "grammar-2026-08-23-although-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.copular-predicate"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC04",
      "category": "although",
      "categoryLabel": "薄弱项复测｜完整主语",
      "type": "single",
      "source": "Although the little bird sings, the room stays quiet.",
      "prompt": "第一部分的完整主语是什么？",
      "options": [
        "the little bird",
        "bird",
        "sings",
        "the room"
      ],
      "answer": "the little bird",
      "answerDisplay": "the little bird",
      "correctFeedback": "正确。冠词、形容词和名词共同组成完整主语。",
      "wrongFeedback": "不要只选中心名词 bird。",
      "explanation": "完整主语是 the little bird。",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.subject-boundary-no-object-discrimination",
      "weaknessIds": [
        "brother.sentence-parts.subject-boundary-no-object-discrimination"
      ],
      "diagnosticTargets": [
        "subject-noun-phrase",
        "complete-subject-boundary"
      ],
      "contentHash": "sha256:21d51a88d324da71996de03eb04c6ec890c61e8f6627c51c5df98bebc6c2237c",
      "bankItemId": "grammar-2026-08-23-although-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.subject-boundary-no-object-discrimination"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC05",
      "category": "although",
      "categoryLabel": "Although 句首",
      "type": "single",
      "source": "___ the task is hard, Mia keeps trying.",
      "prompt": "选择正确答案。",
      "options": [
        "Although",
        "But",
        "Because",
        "So"
      ],
      "answer": "Although",
      "answerDisplay": "Although the task is hard, Mia keeps trying.",
      "correctFeedback": "正确。困难与继续尝试形成让步。",
      "wrongFeedback": "空格在句首，要表达“虽然”。",
      "explanation": "Although A, B.",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:d331f4be9d59a368c0c092a8c1fc7f0a710327a530469ca91861dca42280a140",
      "bankItemId": "grammar-2026-08-23-although-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::although"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC06",
      "category": "but",
      "categoryLabel": "but 句中",
      "type": "single",
      "source": "The dog is small, ___ it is brave.",
      "prompt": "选择正确答案。",
      "options": [
        "but",
        "although",
        "because",
        "so"
      ],
      "answer": "but",
      "answerDisplay": "The dog is small, but it is brave.",
      "correctFeedback": "正确。but 放在两部分之间。",
      "wrongFeedback": "空格后是转折后的信息。",
      "explanation": "A, but B.",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:b2bbddf9718a8f527a6632ffaa6acea1c17a91cddd9deb40e99c57076b689cfc",
      "bankItemId": "grammar-2026-08-23-although-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::but"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC07",
      "category": "but",
      "categoryLabel": "but 结构",
      "type": "single",
      "prompt": "哪一句结构正确？",
      "options": [
        "The road is long, but we keep walking.",
        "Although the road is long, but we keep walking.",
        "The road but is long, we keep walking.",
        "But although the road is long, we keep walking."
      ],
      "answer": "The road is long, but we keep walking.",
      "answerDisplay": "The road is long, but we keep walking.",
      "correctFeedback": "正确。只使用 but 连接两个完整意思。",
      "wrongFeedback": "排除同时出现 although 与 but 的句子。",
      "explanation": "基础阶段二选一。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:56c5d849aa91a5ca1356189e10f0d3ce74a579c2517f77ec3606a99dd2936c3e",
      "bankItemId": "grammar-2026-08-23-although-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::but"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC08",
      "category": "but",
      "categoryLabel": "同义改写",
      "type": "single",
      "source": "Although the room is small, it is bright.",
      "prompt": "改成 but 结构，哪一句正确？",
      "options": [
        "The room is small, but it is bright.",
        "The room is small because it is bright.",
        "The room is small, so it is bright.",
        "Although the room is small, but it is bright."
      ],
      "answer": "The room is small, but it is bright.",
      "answerDisplay": "The room is small, but it is bright.",
      "correctFeedback": "正确。保留原来的转折关系。",
      "wrongFeedback": "换成 A, but B.，不要保留 Although。",
      "explanation": "Although A, B. 与 A, but B. 可表达同一组转折。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:68188a5baca33ea5538632e4f83ade14a422b4c4c3376f63e101c8f00b645894",
      "bankItemId": "grammar-2026-08-23-although-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::but"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC09",
      "category": "no_double",
      "categoryLabel": "不并用",
      "type": "single",
      "prompt": "哪一句需要改正？",
      "options": [
        "Although it is late, we finish the book.",
        "It is late, but we finish the book.",
        "Although it is late, but we finish the book.",
        "The book is long, but it is fun."
      ],
      "answer": "Although it is late, but we finish the book.",
      "answerDisplay": "Although it is late, but we finish the book.",
      "correctFeedback": "正确。这一句重复使用了两个转折词。",
      "wrongFeedback": "找同时出现 although 和 but 的句子。",
      "explanation": "基础阶段 although 与 but 二选一。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:6830e7240a36bb91d441bfbc4bae0878d1bd217aa07ff6c97ce8ecec67187c63",
      "bankItemId": "grammar-2026-08-23-although-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::no_double"
    },
    {
      "id": "grammar-2026-08-23-although-review::GC10",
      "category": "no_double",
      "categoryLabel": "判断步骤",
      "type": "single",
      "prompt": "写让步句时，最稳妥的检查顺序是什么？",
      "options": [
        "先找相反信息，再选 although 或 but，最后检查不并用。",
        "先同时写 although 和 but。",
        "只看句子长短。",
        "所有句子都使用 because。"
      ],
      "answer": "先找相反信息，再选 although 或 but，最后检查不并用。",
      "answerDisplay": "先找相反信息，再选 although 或 but，最后检查不并用。",
      "correctFeedback": "正确。先判断关系，再选择结构。",
      "wrongFeedback": "关键是“找关系—二选一—再检查”。",
      "explanation": "让步与转折的三步检查法。",
      "primaryWeaknessId": "",
      "weaknessIds": [],
      "diagnosticTargets": [],
      "contentHash": "sha256:7a88f3fbf1603b05264b814812c5aba9a52408212b48f6c8d30e2b8e03bf1a60",
      "bankItemId": "grammar-2026-08-23-although-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-23-although-review",
      "sourceChallengeDate": "2026-08-23",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "sentence-parts"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "variantGroupId": "although::no_double"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC01",
      "category": "adjective_before_noun",
      "categoryLabel": "形容词 + 名词｜a quiet room",
      "type": "single",
      "source": "We read in a ___ room.",
      "prompt": "选择正确答案。",
      "options": [
        "quiet",
        "quietly",
        "room quiet",
        "is quiet"
      ],
      "answer": "quiet",
      "answerDisplay": "We read in a quiet room.",
      "correctFeedback": "正确。quiet 放在普通名词 room 前。",
      "wrongFeedback": "先看空格后面的普通名词 room。",
      "explanation": "形容词可以放在普通名词前。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8f2aedc5a6d30b5a197fc188834652e944542686850e1b388fed79c3c126e6bc",
      "variantGroupId": "adjectives-linking-verbs::adjective_before_noun"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC02",
      "category": "adjective_before_noun",
      "categoryLabel": "形容词 + 名词｜a heavy bag",
      "type": "single",
      "prompt": "哪一个名词短语正确？",
      "options": [
        "a heavy bag",
        "a bag heavy",
        "a heavily bag",
        "a bag is heavy"
      ],
      "answer": "a heavy bag",
      "answerDisplay": "a heavy bag",
      "correctFeedback": "正确。heavy 在名词 bag 前。",
      "wrongFeedback": "这里只需要一个名词短语，不是完整句子。",
      "explanation": "普通名词前使用形容词。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:a90c23b4bd5104a0f29c664e4a7b3c0c47099bd3eebe6d5293b74c5d12a7beb6",
      "variantGroupId": "adjectives-linking-verbs::adjective_before_noun"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC03",
      "category": "copular_predicate",
      "categoryLabel": "薄弱项复测｜be + 形容词状态谓语",
      "type": "single",
      "source": "The rabbit is quiet.",
      "prompt": "哪一部分共同表达兔子的状态？",
      "options": [
        "is quiet",
        "The rabbit",
        "quiet rabbit",
        "is"
      ],
      "answer": "is quiet",
      "answerDisplay": "is quiet",
      "correctFeedback": "正确。is 与 quiet 一起表达主语的状态。",
      "wrongFeedback": "不要只圈 is；状态词 quiet 也是谓语的一部分。",
      "explanation": "be 动词与后面的表语共同构成状态谓语。",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.copular-predicate",
      "weaknessIds": [
        "brother.sentence-parts.copular-predicate"
      ],
      "diagnosticTargets": [
        "copular-predicate",
        "be-plus-adjective-state-predicate"
      ],
      "contentHash": "sha256:e3112ae424b26db225926df8b217b1a62ac9120758b2e84c6599ce0615bb64d9",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.copular-predicate"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC04",
      "category": "copular_predicate",
      "categoryLabel": "薄弱项复测｜复数主语的状态谓语",
      "type": "single",
      "source": "The boxes are heavy.",
      "prompt": "哪一部分共同表达盒子的状态？",
      "options": [
        "are heavy",
        "The boxes",
        "heavy boxes",
        "are"
      ],
      "answer": "are heavy",
      "answerDisplay": "are heavy",
      "correctFeedback": "正确。are heavy 一起说明 boxes 的状态。",
      "wrongFeedback": "状态谓语不只包含 are，还包含形容词 heavy。",
      "explanation": "be 动词与形容词共同表达状态。",
      "kpId": "sentence-parts",
      "primaryWeaknessId": "brother.sentence-parts.copular-predicate",
      "weaknessIds": [
        "brother.sentence-parts.copular-predicate"
      ],
      "diagnosticTargets": [
        "copular-predicate",
        "plural-subject-be-adjective-predicate"
      ],
      "contentHash": "sha256:54d41f0d80055bc82ef0419562773a5f88dbfbcf32f343ae9920341727123ae9",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.copular-predicate"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC05",
      "category": "sensory_linking",
      "categoryLabel": "look + 形容词",
      "type": "single",
      "source": "The sky looks ___.",
      "prompt": "选择正确答案。",
      "options": [
        "clear",
        "clearly",
        "clear sky",
        "is clear"
      ],
      "answer": "clear",
      "answerDisplay": "The sky looks clear.",
      "correctFeedback": "正确。looks 在这里连接 sky 和状态 clear。",
      "wrongFeedback": "这里是在描述 sky 怎么样。",
      "explanation": "感官系动词 look 后使用形容词。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:b646f763ac943e7e8d06dce1930476dd0035170f0e379529e06bbadffbd568d4",
      "variantGroupId": "adjectives-linking-verbs::sensory_linking"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC06",
      "category": "sensory_linking",
      "categoryLabel": "taste + 形容词",
      "type": "single",
      "source": "The bread tastes ___.",
      "prompt": "选择正确答案。",
      "options": [
        "fresh",
        "freshly",
        "fresh bread",
        "taste freshly"
      ],
      "answer": "fresh",
      "answerDisplay": "The bread tastes fresh.",
      "correctFeedback": "正确。tastes 后用形容词描述 bread。",
      "wrongFeedback": "句子是在说面包是什么味道，不是在说品尝动作怎么做。",
      "explanation": "taste 作系动词时后接形容词。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:13a42b6a413dd1e075ff2feacf906f1f34df2bd039b4b2913dacff09c060dd18",
      "variantGroupId": "adjectives-linking-verbs::sensory_linking"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC07",
      "category": "sensory_linking",
      "categoryLabel": "feel + 形容词",
      "type": "single",
      "source": "I feel ___ after the game.",
      "prompt": "选择正确答案。",
      "options": [
        "tired",
        "tiredly",
        "a tired",
        "tire"
      ],
      "answer": "tired",
      "answerDisplay": "I feel tired after the game.",
      "correctFeedback": "正确。feel 后用 tired 描述主语 I 的状态。",
      "wrongFeedback": "这里是“我感到累”，需要形容词。",
      "explanation": "feel 作系动词时后接形容词。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:6f3010740ba5ed0606af795615dc9bc81087ba70b65a10df7f64c07573fea08c",
      "variantGroupId": "adjectives-linking-verbs::sensory_linking"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC08",
      "category": "position_contrast",
      "categoryLabel": "同一形容词的两个位置",
      "type": "single",
      "prompt": "哪一组全部正确？",
      "options": [
        "a soft bed / The bed feels soft.",
        "a bed soft / The bed feels softly.",
        "a softly bed / The bed soft feels.",
        "soft a bed / Feels the bed soft."
      ],
      "answer": "a soft bed / The bed feels soft.",
      "answerDisplay": "a soft bed / The bed feels soft.",
      "correctFeedback": "正确。同一个 soft 可以放名词前，也可以放系动词后。",
      "wrongFeedback": "先分别找普通名词 bed 和系动词 feels。",
      "explanation": "形容词的位置由句子结构决定。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:5aa74a8ba755f1c5d0784a31036ff441dfb8e8a6c00763c024dac3a54c3ed041",
      "variantGroupId": "adjectives-linking-verbs::position_contrast"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC09",
      "category": "position_contrast",
      "categoryLabel": "辨认系动词",
      "type": "single",
      "prompt": "哪一句用形容词描述主语的状态？",
      "options": [
        "The bell sounds loud.",
        "The girl sings beautifully.",
        "The boy runs quickly.",
        "The cat moves quietly."
      ],
      "answer": "The bell sounds loud.",
      "answerDisplay": "The bell sounds loud.",
      "correctFeedback": "正确。sounds 把 bell 和状态 loud 连起来。",
      "wrongFeedback": "找出“主语怎么样”的句子。",
      "explanation": "sound 作系动词时后接形容词。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:1dacd6d2fda03306ed1ce986fd36872a23a574443cb03fc6c5e3c43fc57ecbe6",
      "variantGroupId": "adjectives-linking-verbs::position_contrast"
    },
    {
      "id": "grammar-2026-08-22-adjectives-linking-verbs-review::GC10",
      "category": "position_contrast",
      "categoryLabel": "改错｜系动词后用形容词",
      "type": "single",
      "prompt": "选择正确句子。",
      "options": [
        "The soap smells fresh.",
        "The soap smells freshly.",
        "The fresh smells soap.",
        "The soap fresh smell."
      ],
      "answer": "The soap smells fresh.",
      "answerDisplay": "The soap smells fresh.",
      "correctFeedback": "正确。smell 后用 fresh 描述 soap。",
      "wrongFeedback": "smell 在这里不是动作方式，而是在连接主语和气味状态。",
      "explanation": "感官系动词后接形容词。",
      "bankItemId": "grammar-2026-08-22-adjectives-linking-verbs-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-22-adjectives-linking-verbs-review",
      "sourceChallengeDate": "2026-08-22",
      "sourceChallengeTitle": "形容词与系动词复习挑战",
      "sourceLessonKey": "adjectives-linking-verbs",
      "sourceLessonKpIds": [
        "adjectives-linking-verbs",
        "sentence-parts"
      ],
      "kpIds": [
        "adjectives-linking-verbs"
      ],
      "primaryKpId": "adjectives-linking-verbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:3affa1975e39aca0daecbc2f34fb892be251f858cedeea200fa7f76c1d0d42e6",
      "variantGroupId": "adjectives-linking-verbs::position_contrast"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC01",
      "kpId": "pronoun-system",
      "category": "subject",
      "categoryLabel": "复数名词主语换成 they",
      "type": "single",
      "prompt": "The boys are in the library. ___ are reading quietly.",
      "options": [
        "They",
        "Them",
        "Their",
        "Theirs"
      ],
      "answer": "They",
      "answerDisplay": "They are reading quietly.",
      "correctFeedback": "正确。The boys 是复数主语，换成 They。",
      "wrongFeedback": "先把 The boys 换成第三人称复数主格。",
      "explanation": "主语位置用主格代词 They。",
      "primaryWeaknessId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping",
      "weaknessIds": [
        "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
      ],
      "diagnosticTargets": [
        "plural-noun-subject-to-they",
        "subject-pronoun-selection"
      ],
      "contentHash": "sha256:54858e65bd2c9a35fa728e006d4937ebef36273177810452974d7f28b36b70af",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "subject-pronouns-be"
      ],
      "primaryKpId": "subject-pronouns-be",
      "variantGroupId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC02",
      "kpId": "pronoun-system",
      "category": "subject",
      "categoryLabel": "Tom and I 换成 we",
      "type": "single",
      "prompt": "Tom and I are classmates. ___ study English together.",
      "options": [
        "We",
        "Us",
        "They",
        "Them"
      ],
      "answer": "We",
      "answerDisplay": "We study English together.",
      "correctFeedback": "正确。说话人 I 和另一人合在一起，用 We。",
      "wrongFeedback": "Tom and I 包含说话人，是第一人称复数。",
      "explanation": "主语位置用主格代词 We。",
      "primaryWeaknessId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping",
      "weaknessIds": [
        "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
      ],
      "diagnosticTargets": [
        "compound-subject-with-i-to-we",
        "subject-pronoun-selection"
      ],
      "contentHash": "sha256:fd47a2e5e4c6dbf2ef5ac7f6c6d923188bf223144e6ef4d9b2732b2963346d48",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "subject-pronouns-be"
      ],
      "primaryKpId": "subject-pronouns-be",
      "variantGroupId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC03",
      "kpId": "pronoun-system",
      "category": "object",
      "categoryLabel": "动词后用宾格",
      "type": "single",
      "prompt": "Mia knows Ben. Mia knows ___.",
      "options": [
        "he",
        "him",
        "his",
        "himself"
      ],
      "answer": "him",
      "answerDisplay": "Mia knows him.",
      "correctFeedback": "正确。know 后是宾语，用 him。",
      "wrongFeedback": "Ben 在动词 knows 后面，是宾语。",
      "explanation": "男性单数宾格是 him。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:70d1de76978083c24f3caba3dde0ffada4fa4d88c4dcec55266aa3bd7301a353",
      "variantGroupId": "pronoun-system::object"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC04",
      "kpId": "pronoun-system",
      "category": "object",
      "categoryLabel": "介词后用宾格",
      "type": "single",
      "prompt": "This gift is for Crystal and me. It is for ___.",
      "options": [
        "we",
        "us",
        "our",
        "ours"
      ],
      "answer": "us",
      "answerDisplay": "It is for us.",
      "correctFeedback": "正确。介词 for 后用宾格 us。",
      "wrongFeedback": "先看 for 后需要哪一种代词。",
      "explanation": "介词后通常使用宾格。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:1f79732f38ecb0c8f8ab8ac42231535c47cde0793b72b6d7eeb178cfe094a686",
      "variantGroupId": "pronoun-system::object"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC05",
      "kpId": "pronoun-system",
      "category": "possessive",
      "categoryLabel": "名词前用形容词性物主代词",
      "type": "single",
      "prompt": "Lucy has a kite. ___ kite is red.",
      "options": [
        "Her",
        "Hers",
        "She",
        "Herself"
      ],
      "answer": "Her",
      "answerDisplay": "Her kite is red.",
      "correctFeedback": "正确。kite 前用 Her。",
      "wrongFeedback": "空格后还有名词 kite。",
      "explanation": "名词前用形容词性物主代词 her。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:06434229afff4df8fde19476c3f248024a7039834e8eadc01e6531f82e4ea6ac",
      "variantGroupId": "pronoun-system::possessive"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC06",
      "kpId": "pronoun-system",
      "category": "possessive",
      "categoryLabel": "后面没有名词用名词性物主代词",
      "type": "single",
      "prompt": "My bag is blue. The green bag is ___.",
      "options": [
        "your",
        "yours",
        "you",
        "yourself"
      ],
      "answer": "yours",
      "answerDisplay": "The green bag is yours.",
      "correctFeedback": "正确。空格后没有名词，用 yours。",
      "wrongFeedback": "这个词要独立表示“你的包”。",
      "explanation": "名词性物主代词可以独立使用。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8d7dc60a01ac31c028187e6d3a9b418aa7d435cfb45d990fa4b23629af1abec3",
      "variantGroupId": "pronoun-system::possessive"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC07",
      "kpId": "pronoun-system",
      "category": "subject_object",
      "categoryLabel": "主格与宾格成对判断",
      "type": "single",
      "prompt": "Anna sees Ben. ___ smiles at ___.",
      "options": [
        "She / him",
        "Her / he",
        "Hers / his",
        "Herself / himself"
      ],
      "answer": "She / him",
      "answerDisplay": "She smiles at him.",
      "correctFeedback": "正确。She 作主语，介词 at 后用宾格 him。",
      "wrongFeedback": "第一个空是主语，第二个空在介词 at 后。",
      "explanation": "主语位置用主格；动词或介词后用宾格。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9e180fd1f07cfe93a66c4f69fdf835ac40ffad23d4e962f149c459773fc261d8",
      "variantGroupId": "pronoun-system::subject_object"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC08",
      "kpId": "pronoun-system",
      "category": "possessive",
      "categoryLabel": "物主代词独立使用",
      "type": "single",
      "prompt": "We have a classroom. This classroom is ___.",
      "options": [
        "our",
        "ours",
        "us",
        "we"
      ],
      "answer": "ours",
      "answerDisplay": "This classroom is ours.",
      "correctFeedback": "正确。空格后没有名词，用 ours 独立表示“我们的教室”。",
      "wrongFeedback": "空格后没有名词，要用能独立表示所属的代词。",
      "explanation": "名词性物主代词 ours 可以独立使用。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:38eb57497624cf939f74da7f5ff0c8f84856472799483287b6197b48efc43c05",
      "variantGroupId": "pronoun-system::possessive"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC09",
      "kpId": "pronoun-system",
      "category": "reflexive",
      "categoryLabel": "反身代词回指主语",
      "type": "single",
      "prompt": "Lily sees ___ in the mirror.",
      "options": [
        "she",
        "her",
        "hers",
        "herself"
      ],
      "answer": "herself",
      "answerDisplay": "Lily sees herself in the mirror.",
      "correctFeedback": "正确。Lily 看见的仍是 Lily，herself 回指主语。",
      "wrongFeedback": "镜子里的人和主语 Lily 是同一个人。",
      "explanation": "主语和宾语指同一个人时，用对应的反身代词。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9b51b32b73c41ab4ca013e6add22f6e4d050017b0387c354c02c90caa0953098",
      "variantGroupId": "pronoun-system::reflexive"
    },
    {
      "id": "grammar-2026-08-21-pronoun-system-review::GC10",
      "kpId": "pronoun-system",
      "category": "mixed",
      "categoryLabel": "综合判断代词工作",
      "type": "single",
      "prompt": "哪一组全部正确？",
      "options": [
        "She helps me. / This book is hers. / Mia sees herself in the mirror.",
        "Her helps I. / This book is her. / Mia sees she in the mirror.",
        "She helps my. / This book is she. / Mia sees hers in the mirror.",
        "Hers helps me. / This book is her. / Mia sees her in the mirror."
      ],
      "answer": "She helps me. / This book is hers. / Mia sees herself in the mirror.",
      "answerDisplay": "She helps me. / This book is hers. / Mia sees herself in the mirror.",
      "correctFeedback": "正确。主格、宾格、物主和反身代词都各司其职。",
      "wrongFeedback": "逐句找主语、宾语、所属和回指关系。",
      "explanation": "判断代词不能只看中文，要看它在句中的位置和工作。",
      "bankItemId": "grammar-2026-08-21-pronoun-system-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-21-pronoun-system-review",
      "sourceChallengeDate": "2026-08-21",
      "sourceChallengeTitle": "人称代词系统复习挑战",
      "sourceLessonKey": "pronoun-system",
      "sourceLessonKpIds": [
        "pronoun-system",
        "subject-pronouns-be"
      ],
      "kpIds": [
        "pronoun-system"
      ],
      "primaryKpId": "pronoun-system",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:52accf42b7ce41a38201f24a694fc7420a23b71313b6db905776d7c2fdf276d5",
      "variantGroupId": "pronoun-system::mixed"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC01",
      "kpId": "although-concession-basic",
      "category": "although_form",
      "categoryLabel": "although｜选择连接词",
      "type": "single",
      "source": "___ it was raining, we played outside.",
      "prompt": "选择正确答案。",
      "options": [
        "Although",
        "Because",
        "So",
        "But"
      ],
      "answer": "Although",
      "answerDisplay": "Although it was raining, we played outside.",
      "correctFeedback": "正确。下雨和仍然出去玩形成转折让步。",
      "wrongFeedback": "句意是‘虽然下雨，我们还是出去玩了’。",
      "explanation": "although 引导与主句结果相反的让步信息。",
      "bankItemId": "grammar-2026-08-20-although-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:41b4580bf533032b3302460f9fce37441ccaa31bc23d312f82f443d0f75cf63c",
      "variantGroupId": "although::although_form"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC02",
      "kpId": "although-concession-basic",
      "category": "although_form",
      "categoryLabel": "although｜句首结构",
      "type": "single",
      "source": "Although Leo was tired, ___.",
      "prompt": "哪一个主句最合适？",
      "options": [
        "he finished his homework",
        "because he slept",
        "but he finished his homework",
        "so tired"
      ],
      "answer": "he finished his homework",
      "answerDisplay": "Although Leo was tired, he finished his homework.",
      "correctFeedback": "正确。虽然累，他仍然完成了作业。",
      "wrongFeedback": "主句要完整，并且不要再加 but。",
      "explanation": "Although 从句后接完整主句。",
      "bankItemId": "grammar-2026-08-20-although-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8030c938ae6490f2453b3839499d2d133d455e2030c042720cf786580cc65531",
      "variantGroupId": "although::although_form"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC03",
      "kpId": "although-concession-basic",
      "category": "although_form",
      "categoryLabel": "although｜句中结构",
      "type": "single",
      "source": "We went for a walk ___ it was cold.",
      "prompt": "选择正确答案。",
      "options": [
        "although",
        "so",
        "because",
        "but"
      ],
      "answer": "although",
      "answerDisplay": "We went for a walk although it was cold.",
      "correctFeedback": "正确。although 从句也可以放在主句后。",
      "wrongFeedback": "寒冷与仍然散步形成让步关系。",
      "explanation": "主句 + although + 从句。",
      "bankItemId": "grammar-2026-08-20-although-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:764c79b5040caccffd829456eb9c244d7ad00a768197f0769e4f45385b8ac0d2",
      "variantGroupId": "although::although_form"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC04",
      "kpId": "although-concession-basic",
      "category": "although_meaning",
      "categoryLabel": "although｜理解句意",
      "type": "single",
      "prompt": "Although the bag was heavy, Mia carried it home. 这句话最接近哪一个意思？",
      "options": [
        "虽然包很重，Mia 还是把它带回了家。",
        "因为包很重，Mia 没带回家。",
        "包很重，所以 Mia 买了它。",
        "Mia 不知道包很重。"
      ],
      "answer": "虽然包很重，Mia 还是把它带回了家。",
      "answerDisplay": "虽然包很重，Mia 还是把它带回了家。",
      "correctFeedback": "正确。重是阻碍，但动作仍然发生。",
      "wrongFeedback": "抓住 heavy 与 carried it home 的相反方向。",
      "explanation": "although 表示‘虽然……但是结果仍然……’。",
      "bankItemId": "grammar-2026-08-20-although-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:05524be7ebd74adcffa87e789595ca5041a635ba5c907faf1f14d2f90ecf1265",
      "variantGroupId": "although::although_meaning"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC05",
      "kpId": "although-concession-basic",
      "category": "although_meaning",
      "categoryLabel": "although｜找出仍然发生的结果",
      "type": "single",
      "source": "Although the book was difficult, Gavin finished it.",
      "prompt": "哪一部分是仍然发生的结果？",
      "options": [
        "Gavin finished it",
        "the book was difficult",
        "Although the book",
        "difficult Gavin"
      ],
      "answer": "Gavin finished it",
      "answerDisplay": "Gavin finished it.",
      "correctFeedback": "正确。困难没有阻止 Gavin 完成。",
      "wrongFeedback": "找 although 从句之外的完整主句。",
      "explanation": "主句说明尽管有阻碍仍然发生的结果。",
      "bankItemId": "grammar-2026-08-20-although-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:40a68eaefc9d7e258529cdf38aabd04592c5bc35ec4f050b31633a6abd9a317a",
      "variantGroupId": "although::although_meaning"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC06",
      "kpId": "although-concession-basic",
      "category": "although_correction",
      "categoryLabel": "纠错｜although 不与 but 成对",
      "type": "single",
      "source": "Although it was late, but we kept reading.",
      "prompt": "选择正确的改法。",
      "options": [
        "Although it was late, we kept reading.",
        "Although it was late, but kept reading.",
        "It was although late, we kept reading.",
        "Although late but we kept reading."
      ],
      "answer": "Although it was late, we kept reading.",
      "answerDisplay": "Although it was late, we kept reading.",
      "correctFeedback": "正确。保留 although，删掉 but。",
      "wrongFeedback": "同一句里 although 和 but 不成对使用。",
      "explanation": "although 本身已经连接两个分句。",
      "bankItemId": "grammar-2026-08-20-although-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:bb3e727ee0eb817417fc3735d839391e7e90d816e7b02bb86e11e071aaa819b8",
      "variantGroupId": "although::although_correction"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC07",
      "kpId": "although-concession-basic",
      "category": "although_correction",
      "categoryLabel": "纠错｜两个完整分句",
      "type": "single",
      "source": "Although the room was small, was clean.",
      "prompt": "选择正确的改法。",
      "options": [
        "Although the room was small, it was clean.",
        "Although the room small, was clean.",
        "Although was small, the room clean.",
        "The room although small, but clean."
      ],
      "answer": "Although the room was small, it was clean.",
      "answerDisplay": "Although the room was small, it was clean.",
      "correctFeedback": "正确。两个分句都有自己的主语和谓语。",
      "wrongFeedback": "逗号后需要完整主句 it was clean。",
      "explanation": "基础结构使用两个完整分句。",
      "bankItemId": "grammar-2026-08-20-although-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:51b56103ed578aef1440d11f89533c530d6937ea3ae54f28c9494e0dc0b68a3a",
      "variantGroupId": "although::although_correction"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC08",
      "kpId": "although-concession-basic",
      "category": "although_order",
      "categoryLabel": "排序｜although 句",
      "type": "single",
      "prompt": "哪一个句子顺序正确？",
      "options": [
        "Although she was afraid, she opened the door.",
        "She although was afraid, opened the door but.",
        "Although afraid she, the door opened.",
        "Although she afraid, but she opened door."
      ],
      "answer": "Although she was afraid, she opened the door.",
      "answerDisplay": "Although she was afraid, she opened the door.",
      "correctFeedback": "正确。although 从句和主句都完整。",
      "wrongFeedback": "先找 Although + 主语 + 谓语，再找完整主句。",
      "explanation": "Although she was afraid, she opened the door.",
      "bankItemId": "grammar-2026-08-20-although-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "although"
      ],
      "primaryKpId": "although",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:0f1181389c3488c2394c295e3cc8051147be89a6c688b68776bf0752d527d615",
      "variantGroupId": "although::although_order"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC09",
      "kpId": "subject-pronouns-be",
      "category": "weakness_pronoun_mapping",
      "categoryLabel": "薄弱项平行题｜名词主语换人称代词",
      "type": "single",
      "source": "Mia and I are ready.",
      "prompt": "用一个人称代词替换主语 Mia and I。",
      "options": [
        "We",
        "They",
        "She",
        "Us"
      ],
      "answer": "We",
      "answerDisplay": "We are ready.",
      "correctFeedback": "正确。I 和另一个人组成‘我们’，用 We。",
      "wrongFeedback": "只要并列主语包含 I，并表示两个人一起，就想到 we。",
      "explanation": "Mia and I → We。",
      "primaryWeaknessId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping",
      "weaknessIds": [
        "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
      ],
      "diagnosticTargets": [
        "first-person-plural-we",
        "subject-to-pronoun-mapping"
      ],
      "contentHashAlgorithm": "sha256 of UTF-8 source, newline, prompt, newline, answer",
      "contentHash": "sha256:1dd5275f2eebb3e233d0a1aad1eaafd91c220de618517050479aeaf54dd26deb",
      "bankItemId": "grammar-2026-08-20-although-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "subject-pronouns-be"
      ],
      "primaryKpId": "subject-pronouns-be",
      "variantGroupId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
    },
    {
      "id": "grammar-2026-08-20-although-review::GC10",
      "kpId": "third-person-singular",
      "category": "weakness_third_person",
      "categoryLabel": "薄弱项平行题｜第三人称单数",
      "type": "single",
      "source": "My sister reads every evening.",
      "prompt": "主语 My sister 是第几人称单数？",
      "options": [
        "第三人称单数",
        "第一人称单数",
        "第二人称",
        "第三人称复数"
      ],
      "answer": "第三人称单数",
      "answerDisplay": "My sister = she = 第三人称单数。",
      "correctFeedback": "正确。My sister 可以换成 she。",
      "wrongFeedback": "先把 My sister 换成人称代词 she。",
      "explanation": "单数名词短语 My sister 属于第三人称单数。",
      "primaryWeaknessId": "brother.third-person-singular.identify-third-person-singular-subject",
      "weaknessIds": [
        "brother.third-person-singular.identify-third-person-singular-subject"
      ],
      "diagnosticTargets": [
        "identify-third-person-singular",
        "noun-phrase-to-she"
      ],
      "contentHashAlgorithm": "sha256 of UTF-8 source, newline, prompt, newline, answer",
      "contentHash": "sha256:3b546d9f2e334609d0b20af7d7a8bf980ebd502d51b03a53b8d5b4bf3d8010af",
      "bankItemId": "grammar-2026-08-20-although-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-20-although-review",
      "sourceChallengeDate": "2026-08-20",
      "sourceChallengeTitle": "although 让步转折复习挑战",
      "sourceLessonKey": "although",
      "sourceLessonKpIds": [
        "although",
        "subject-pronouns-be",
        "third-person-singular"
      ],
      "kpIds": [
        "third-person-singular"
      ],
      "primaryKpId": "third-person-singular",
      "variantGroupId": "brother.third-person-singular.identify-third-person-singular-subject"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC01",
      "category": "why",
      "categoryLabel": "why｜询问原因",
      "type": "single",
      "source": "___ are you happy?",
      "prompt": "选择正确的疑问词。",
      "options": [
        "Why",
        "What",
        "Where",
        "When"
      ],
      "answer": "Why",
      "answerDisplay": "Why are you happy?",
      "correctFeedback": "正确。回答会说明开心的原因，所以用 why。",
      "wrongFeedback": "先看问题是不是在问“为什么”。",
      "explanation": "why 用来询问原因。",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:11db2f6d4dcb86e012229ccc9d081075f60d41c9e25029d81cc4e025f2702ec1",
      "variantGroupId": "why-because-so::why"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC02",
      "category": "why",
      "categoryLabel": "why｜问答配对",
      "type": "single",
      "prompt": "哪一句是在询问原因？",
      "options": [
        "Why is Lucy late?",
        "Where is Lucy?",
        "When is lunch?",
        "What is this?"
      ],
      "answer": "Why is Lucy late?",
      "answerDisplay": "Why is Lucy late?",
      "correctFeedback": "正确。why 直接询问迟到的原因。",
      "wrongFeedback": "找含有“为什么”意思的问句。",
      "explanation": "why 问原因。",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9ef492f782085985498e6ebdcb9a0344a882f615d3a6115466bb6ee6754c7257",
      "variantGroupId": "why-because-so::why"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC03",
      "category": "why",
      "categoryLabel": "why｜正确语序",
      "type": "single",
      "prompt": "选择语序正确的问句。",
      "options": [
        "Why do you read every day?",
        "Why you do read every day?",
        "Do why you read every day?",
        "You read why every day?"
      ],
      "answer": "Why do you read every day?",
      "answerDisplay": "Why do you read every day?",
      "correctFeedback": "正确。why 放在问句开头。",
      "wrongFeedback": "先用 Why，再接 do you。",
      "explanation": "基础 why 问句：Why + do + 主语 + 动词原形？",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c473ed4a1ba8a30fb3586a5f10b1c6ab54e37b2fb62b1e6d62652d745a4bcd61",
      "variantGroupId": "why-because-so::why"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC04",
      "category": "because",
      "categoryLabel": "because｜说明原因",
      "type": "single",
      "source": "I take an umbrella ___ it is raining.",
      "prompt": "选择正确的连接词。",
      "options": [
        "because",
        "so",
        "but",
        "or"
      ],
      "answer": "because",
      "answerDisplay": "I take an umbrella because it is raining.",
      "correctFeedback": "正确。下雨是带伞的原因。",
      "wrongFeedback": "空格后面解释“为什么带伞”。",
      "explanation": "because 后面说明原因。",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:cbcbe9dc7b1796f3824e65e501b4f30262a6db8b88897773e31d14146e13fb07",
      "variantGroupId": "why-because-so::because"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC05",
      "category": "because",
      "categoryLabel": "because｜回答 why",
      "type": "single",
      "prompt": "Why does Tom stay home?",
      "options": [
        "Because he is sick.",
        "So he is sick.",
        "But he is sick.",
        "Where he is sick."
      ],
      "answer": "Because he is sick.",
      "answerDisplay": "Because he is sick.",
      "correctFeedback": "正确。because 可以直接回答 why 问句。",
      "wrongFeedback": "why 问原因，回答从 because 开始。",
      "explanation": "Why ...? — Because ...",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:afa6e393eac927ad274d0297a9de7734eb21e9cbff29f2e153ce0b7252203348",
      "variantGroupId": "why-because-so::because"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC06",
      "category": "because",
      "categoryLabel": "because｜原因位置",
      "type": "single",
      "prompt": "哪一句把原因说清楚了？",
      "options": [
        "Mia drinks water because she is thirsty.",
        "Mia drinks water so she is thirsty.",
        "Because Mia drinks water so she is thirsty.",
        "Why Mia drinks water."
      ],
      "answer": "Mia drinks water because she is thirsty.",
      "answerDisplay": "Mia drinks water because she is thirsty.",
      "correctFeedback": "正确。口渴是喝水的原因。",
      "wrongFeedback": "找到“结果 + because + 原因”的句子。",
      "explanation": "because 后面接原因。",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8a7c2c2cabfc8e52c1e3108d6145f6d8d6b07ea5a5945e40990817fd72df7800",
      "variantGroupId": "why-because-so::because"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC07",
      "category": "so",
      "categoryLabel": "so｜说明结果",
      "type": "single",
      "source": "It is cold, ___ I wear a coat.",
      "prompt": "选择正确的连接词。",
      "options": [
        "so",
        "because",
        "why",
        "although"
      ],
      "answer": "so",
      "answerDisplay": "It is cold, so I wear a coat.",
      "correctFeedback": "正确。穿外套是天气冷带来的结果。",
      "wrongFeedback": "空格后面是在说结果。",
      "explanation": "so 后面说明结果。",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:2b4db666d582ba6afac350b60f9141c9240c3909f55d7fdd0fa9f770d27abe4f",
      "variantGroupId": "why-because-so::so"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC08",
      "category": "so",
      "categoryLabel": "so｜原因到结果",
      "type": "single",
      "prompt": "哪一句表示“我很累，所以我早点睡”？",
      "options": [
        "I am tired, so I go to bed early.",
        "I go to bed early because I am tired, so.",
        "Why I am tired, I go to bed early.",
        "Because I am tired, so I go to bed early."
      ],
      "answer": "I am tired, so I go to bed early.",
      "answerDisplay": "I am tired, so I go to bed early.",
      "correctFeedback": "正确。前面是原因，so 后面是结果。",
      "wrongFeedback": "选择“原因, so 结果”的基础结构。",
      "explanation": "A, so B：A 是原因，B 是结果。",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "why-because-so"
      ],
      "primaryKpId": "why-because-so",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:3c7f66b44670cc5d994decf6a59d2f4fb49bb1ad3ebbd44c3b7a15be2af39650",
      "variantGroupId": "why-because-so::so"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC09",
      "category": "weakness",
      "categoryLabel": "薄弱项平行题｜时间补充信息",
      "type": "single",
      "prompt": "在句子《After school, Lucy plays tennis because it is fun.》中，哪一部分是补充的时间信息？",
      "options": [
        "After school",
        "Lucy",
        "plays tennis",
        "because it is fun"
      ],
      "answer": "After school",
      "answerDisplay": "After school",
      "correctFeedback": "正确。After school 说明动作发生的时间。",
      "wrongFeedback": "先找主干 Lucy plays tennis，再看哪一部分补充时间。",
      "explanation": "时间短语可以放在句首，为句子补充时间信息。",
      "primaryWeaknessId": "brother.sentence-parts.time-adjunct",
      "weaknessIds": [
        "brother.sentence-parts.time-adjunct"
      ],
      "diagnosticTargets": [
        "identify-time-adjunct",
        "separate-core-from-time-information"
      ],
      "contentHash": "sha256:2181b2891237df26e71c992dcd7b4e3426e370866cbf0b0b762f85011f0492eb",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.time-adjunct"
    },
    {
      "id": "grammar-2026-08-19-why-because-so-review::GC10",
      "category": "weakness",
      "categoryLabel": "薄弱项平行题｜can + 动词原形",
      "type": "single",
      "prompt": "在句子《Tom can swim because he practises every week.》中，哪两个词共同构成完整谓语？",
      "options": [
        "Tom can",
        "can swim",
        "swim because",
        "every week"
      ],
      "answer": "can swim",
      "answerDisplay": "can swim",
      "correctFeedback": "正确。can 和动词原形 swim 要一起看。",
      "wrongFeedback": "can 后面要接动词原形，两个词共同表达“会游泳”。",
      "explanation": "can + 动词原形共同构成完整谓语。",
      "primaryWeaknessId": "brother.sentence-be-action-aux.modal-can-predicate",
      "weaknessIds": [
        "brother.sentence-be-action-aux.modal-can-predicate"
      ],
      "diagnosticTargets": [
        "modal-can-predicate",
        "can-plus-base-verb"
      ],
      "contentHash": "sha256:39546873c903eddc1689a402274e85ace5e2580c9f2137d169ad7c5d8d6c75cc",
      "bankItemId": "grammar-2026-08-19-why-because-so-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-19-why-because-so-review",
      "sourceChallengeDate": "2026-08-19",
      "sourceChallengeTitle": "why / because / so 复习挑战",
      "sourceLessonKey": "why-because-so",
      "sourceLessonKpIds": [
        "why-because-so",
        "sentence-parts",
        "sentence-be-action-aux"
      ],
      "kpIds": [
        "sentence-be-action-aux"
      ],
      "primaryKpId": "sentence-be-action-aux",
      "variantGroupId": "brother.sentence-be-action-aux.modal-can-predicate"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC01",
      "category": "contact_on",
      "categoryLabel": "接触桌面｜on",
      "type": "single",
      "source": "The notebook is ___ the desk.",
      "prompt": "笔记本接触桌面，选择正确答案。",
      "options": [
        "on",
        "over",
        "above",
        "under"
      ],
      "answer": "on",
      "answerDisplay": "The notebook is on the desk.",
      "correctFeedback": "正确。接触桌面用 on。",
      "wrongFeedback": "先检查笔记本是否接触桌面。",
      "explanation": "on 表示接触物体表面。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e53206736cd2bc1432068c385dff0790b905ceceab41dd10009592910d119802",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contact_on"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC02",
      "category": "contact_on",
      "categoryLabel": "接触墙面｜on",
      "type": "single",
      "source": "A map is ___ the wall.",
      "prompt": "地图贴在墙面上，选择正确答案。",
      "options": [
        "on",
        "above",
        "below",
        "under"
      ],
      "answer": "on",
      "answerDisplay": "A map is on the wall.",
      "correctFeedback": "正确。接触竖直墙面也用 on。",
      "wrongFeedback": "on 的关键是接触，不是表面朝哪个方向。",
      "explanation": "接触墙面时也用 on。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7ec150023230ac1c5a153c87a6399b9002f400d3aea663b12d574d555ac4c7d8",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contact_on"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC03",
      "category": "over_above",
      "categoryLabel": "正上方｜over",
      "type": "single",
      "source": "The light is directly ___ the table.",
      "prompt": "灯在桌子正上方且不接触，选择正确答案。",
      "options": [
        "over",
        "on",
        "below",
        "under"
      ],
      "answer": "over",
      "answerDisplay": "The light is directly over the table.",
      "correctFeedback": "正确。正上方且不接触用 over。",
      "wrongFeedback": "directly 提醒你寻找正上方关系。",
      "explanation": "over 强调正上方。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:cbe95d13f6642498fea4e054e7c2118938ad9ab1acfe3adf42c139d6bbe81611",
      "variantGroupId": "place-prepositions-on-over-above-under-below::over_above"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC04",
      "category": "over_above",
      "categoryLabel": "横跨上方｜over",
      "type": "single",
      "source": "The bridge goes ___ the river.",
      "prompt": "桥横跨河面上方，选择正确答案。",
      "options": [
        "over",
        "on",
        "under",
        "below"
      ],
      "answer": "over",
      "answerDisplay": "The bridge goes over the river.",
      "correctFeedback": "正确。横跨上方常用 over。",
      "wrongFeedback": "桥没有接触水面，而是横跨在河上方。",
      "explanation": "over 可以表示横跨在上方。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:78a906d81ece69eeee3489c3ecf8c93ac77563f25928b1cdd63e77b300b87fe1",
      "variantGroupId": "place-prepositions-on-over-above-under-below::over_above"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC05",
      "category": "over_above",
      "categoryLabel": "位置更高｜above",
      "type": "single",
      "source": "The bird is high ___ the trees, but not directly over them.",
      "prompt": "选择正确答案。",
      "options": [
        "above",
        "on",
        "under",
        "below"
      ],
      "answer": "above",
      "answerDisplay": "The bird is high above the trees.",
      "correctFeedback": "正确。只表示更高、不一定正对，用 above。",
      "wrongFeedback": "题目已经说明 not directly over。",
      "explanation": "above 表示位置更高。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:77762c6f318cbf0b582e0d7ba66a7b592366591512fa786f81b53ad81fa18616",
      "variantGroupId": "place-prepositions-on-over-above-under-below::over_above"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC06",
      "category": "under_below",
      "categoryLabel": "正下方｜under",
      "type": "single",
      "source": "The puppy is hiding ___ the bench.",
      "prompt": "小狗躲在长凳正下方，选择正确答案。",
      "options": [
        "under",
        "below",
        "on",
        "above"
      ],
      "answer": "under",
      "answerDisplay": "The puppy is hiding under the bench.",
      "correctFeedback": "正确。正下方或遮盖下方用 under。",
      "wrongFeedback": "想一想长凳是否在小狗正上方。",
      "explanation": "under 强调正下方。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:782927e9e094b89bfd6dba7bdd62c9412eb9646a6e2fe5dd36a24641d02f41ba",
      "variantGroupId": "place-prepositions-on-over-above-under-below::under_below"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC07",
      "category": "under_below",
      "categoryLabel": "位置更低｜below",
      "type": "single",
      "source": "The shelf is ___ the window.",
      "prompt": "架子的位置比窗户低，不强调正对，选择正确答案。",
      "options": [
        "below",
        "under",
        "on",
        "over"
      ],
      "answer": "below",
      "answerDisplay": "The shelf is below the window.",
      "correctFeedback": "正确。只比较高低位置用 below。",
      "wrongFeedback": "这里不强调正下方或遮盖。",
      "explanation": "below 表示位置更低。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:5b6ab4da0d5e787693e8c56a3a6ff24985bd49c9045af860b45e10497a84baca",
      "variantGroupId": "place-prepositions-on-over-above-under-below::under_below"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC08",
      "category": "contrast",
      "categoryLabel": "五种关系综合",
      "type": "single",
      "prompt": "哪一组全部正确？",
      "options": [
        "book on desk / lamp over table / kite above trees / cat under chair / name below line",
        "book over desk / lamp on table / kite below trees / cat above chair / name under line",
        "book below desk / lamp under table / kite on trees / cat over chair / name above line",
        "book under desk / lamp below table / kite over trees / cat on chair / name above line"
      ],
      "answer": "book on desk / lamp over table / kite above trees / cat under chair / name below line",
      "answerDisplay": "book on desk / lamp over table / kite above trees / cat under chair / name below line",
      "correctFeedback": "正确。接触、正上、更高、正下、更低五种关系都匹配。",
      "wrongFeedback": "逐个检查接触、正对和高低。",
      "explanation": "先看接触，再看是否正对，最后检查完整关系。",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "place-prepositions-on-over-above-under-below"
      ],
      "primaryKpId": "place-prepositions-on-over-above-under-below",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7a05ad521c52549bef6acfb04155c94e9e18a69e62c2d011e6d87c7e2577489e",
      "variantGroupId": "place-prepositions-on-over-above-under-below::contrast"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC09",
      "category": "weakness_subject_pronoun",
      "categoryLabel": "薄弱项平行新题｜复数主语",
      "type": "single",
      "source": "The books are under the shelf.",
      "prompt": "Which word can replace The books?",
      "options": [
        "they",
        "we",
        "he",
        "it"
      ],
      "answer": "they",
      "answerDisplay": "They are under the shelf.",
      "correctFeedback": "正确。The books 是复数事物，可以换成 they。",
      "wrongFeedback": "先看 books 是一个还是多个，再选代词。",
      "explanation": "复数事物主语用 they；地点短语 under the shelf 保持不变。",
      "primaryWeaknessId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping",
      "weaknessIds": [
        "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
      ],
      "diagnosticTargets": [
        "plural-noun-subject-to-they",
        "subject-pronoun-person-mapping"
      ],
      "contentHash": "sha256:693cac4eda4888edbaab0c61d76e451576cd7a0da1523b92337f663743265cc8",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "subject-pronouns-be"
      ],
      "primaryKpId": "subject-pronouns-be",
      "variantGroupId": "brother.subject-pronouns-be.subject-to-pronoun-person-mapping"
    },
    {
      "id": "grammar-2026-08-18-place-prepositions-review::GC10",
      "category": "weakness_subject_object",
      "categoryLabel": "薄弱项平行新题｜完整主语与无宾语",
      "type": "single",
      "source": "The small cat sleeps under the chair.",
      "prompt": "Which answer is correct?",
      "options": [
        "The small cat is the full subject, and the sentence has no object.",
        "The is the full subject, and chair is the object.",
        "cat is the full subject, and under is the object.",
        "under the chair is the full subject."
      ],
      "answer": "The small cat is the full subject, and the sentence has no object.",
      "answerDisplay": "The small cat is the full subject; sleeps is the predicate; under the chair gives place information; there is no object.",
      "correctFeedback": "正确。The small cat 是完整主语，sleeps 不需要宾语。",
      "wrongFeedback": "先找谁在睡，再看 sleeps 后面是否真的有宾语。",
      "explanation": "under the chair 是地点补充信息，不是宾语。",
      "primaryWeaknessId": "brother.sentence-parts.subject-boundary-no-object-discrimination",
      "weaknessIds": [
        "brother.sentence-parts.subject-boundary-no-object-discrimination"
      ],
      "diagnosticTargets": [
        "complete-subject-boundary",
        "intransitive-no-object",
        "place-adjunct-not-object"
      ],
      "contentHash": "sha256:1c5177ee9eebc1b139e54aa77a0838eba045469b38a83a53d83b64c4b23a2741",
      "bankItemId": "grammar-2026-08-18-place-prepositions-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-18-place-prepositions-review",
      "sourceChallengeDate": "2026-08-18",
      "sourceChallengeTitle": "地点介词上与下复习挑战",
      "sourceLessonKey": "place-prepositions-on-over-above-under-below",
      "sourceLessonKpIds": [
        "place-prepositions-on-over-above-under-below",
        "subject-pronouns-be",
        "sentence-parts"
      ],
      "kpIds": [
        "sentence-parts"
      ],
      "primaryKpId": "sentence-parts",
      "variantGroupId": "brother.sentence-parts.subject-boundary-no-object-discrimination"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC01",
      "category": "time_in",
      "categoryLabel": "季节｜in spring",
      "type": "single",
      "source": "Flowers grow ___ spring.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "in",
      "answerDisplay": "Flowers grow in spring.",
      "correctFeedback": "正确。季节是一段较大的时间范围，用 in。",
      "wrongFeedback": "spring 和年、月属于同一类时间范围。",
      "explanation": "季节前用 in。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d79a28f6c926c1c1e9a4ae34708a7b9d56a8f083db573e8e2001938278a873a7",
      "variantGroupId": "time-prepositions-in-on-at::time_in"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC02",
      "category": "time_in",
      "categoryLabel": "月份｜in December",
      "type": "single",
      "source": "It is cold ___ December.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "in",
      "answerDisplay": "It is cold in December.",
      "correctFeedback": "正确。月份前用 in。",
      "wrongFeedback": "December 是月份，不是具体日期。",
      "explanation": "月份前用 in。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f59c0574c240dd08628d0b1fde018c2723e66b65083533f9c703aaf85b38a86c",
      "variantGroupId": "time-prepositions-in-on-at::time_in"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC03",
      "category": "time_on",
      "categoryLabel": "具体一天的晚上｜on Tuesday evening",
      "type": "single",
      "source": "We read together ___ Tuesday evening.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "on",
      "answerDisplay": "We read together on Tuesday evening.",
      "correctFeedback": "正确。Tuesday evening 是具体某一天的晚上，用 on。",
      "wrongFeedback": "不要只看 evening，要看完整短语 Tuesday evening。",
      "explanation": "具体某一天的早中晚用 on。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:044ecdd951011fa76624511f076f388727a4ffb91f131ab085e7e3ea40253778",
      "variantGroupId": "time-prepositions-in-on-at::time_on"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC04",
      "category": "time_on",
      "categoryLabel": "具体日期｜on August 6th",
      "type": "single",
      "source": "The lesson is ___ August 6th.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "on",
      "answerDisplay": "The lesson is on August 6th.",
      "correctFeedback": "正确。具体日期前用 on。",
      "wrongFeedback": "August 6th 是具体日期。",
      "explanation": "具体日期前用 on。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:794a9ffd28ced6385162e3410da3944467c4065be2a8c26d44476f9a073059dc",
      "variantGroupId": "time-prepositions-in-on-at::time_on"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC05",
      "category": "time_at",
      "categoryLabel": "钟点｜at half past six",
      "type": "single",
      "source": "Dinner starts ___ half past six.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "at",
      "answerDisplay": "Dinner starts at half past six.",
      "correctFeedback": "正确。half past six 是精确时刻，用 at。",
      "wrongFeedback": "精确钟点像时间轴上的一个点。",
      "explanation": "精确钟点前用 at。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e6edf2f6326fcedec932a69069994fe732e5d8c26b359de88d53ec49df67735c",
      "variantGroupId": "time-prepositions-in-on-at::time_at"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC06",
      "category": "time_at",
      "categoryLabel": "固定搭配｜at noon",
      "type": "single",
      "source": "The sun is high ___ noon.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "at",
      "answerDisplay": "The sun is high at noon.",
      "correctFeedback": "正确。固定搭配是 at noon。",
      "wrongFeedback": "noon 是需要记住的高频固定搭配。",
      "explanation": "noon 前用 at。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:0d15d8332a0208b222eb6c81558998f5e5670d6043dc45947ae191c52b4a16b2",
      "variantGroupId": "time-prepositions-in-on-at::time_at"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC07",
      "category": "zero",
      "categoryLabel": "无介词时间词｜next month",
      "type": "single",
      "source": "We will visit Beijing ___ next month.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "不填",
      "answerDisplay": "We will visit Beijing next month.",
      "correctFeedback": "正确。next month 前通常不加 in、on 或 at。",
      "wrongFeedback": "next 开头的这类时间表达通常直接使用。",
      "explanation": "next month 前不加时间介词。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:1342c499a260df853cb89e48de139982bc6a76314d39ecaaef2939892a4201aa",
      "variantGroupId": "time-prepositions-in-on-at::zero"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC08",
      "category": "zero",
      "categoryLabel": "无介词时间词｜every morning",
      "type": "single",
      "source": "Gavin runs ___ every morning.",
      "prompt": "选择正确答案。",
      "options": [
        "in",
        "on",
        "at",
        "不填"
      ],
      "answer": "不填",
      "answerDisplay": "Gavin runs every morning.",
      "correctFeedback": "正确。every morning 前不加时间介词。",
      "wrongFeedback": "看到 every，要先检查是否应该直接使用时间短语。",
      "explanation": "every morning 前不加时间介词。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d6e403eb240791458ed98209acba873ae90e08bb75708e6f8134868c0a4a366a",
      "variantGroupId": "time-prepositions-in-on-at::zero"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC09",
      "category": "contrast",
      "categoryLabel": "普通晚上与具体晚上",
      "type": "single",
      "prompt": "哪一组全部正确？",
      "options": [
        "in the evening / on Friday evening",
        "on the evening / in Friday evening",
        "at the evening / at Friday evening",
        "in evening / on the Friday evening"
      ],
      "answer": "in the evening / on Friday evening",
      "answerDisplay": "in the evening / on Friday evening",
      "correctFeedback": "正确。普通晚上用 in；具体某一天的晚上用 on。",
      "wrongFeedback": "先看 evening 前面有没有具体星期。",
      "explanation": "普通早中晚用 in，具体某一天的早中晚用 on。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ba9d804d45a82783eb1c7b677ec61294f87d4ff07250b75064aa0c7f6683e011",
      "variantGroupId": "time-prepositions-in-on-at::contrast"
    },
    {
      "id": "grammar-2026-08-06-time-prepositions-review::GC10",
      "category": "contrast",
      "categoryLabel": "综合判断",
      "type": "single",
      "prompt": "哪一项全部正确？",
      "options": [
        "A. in winter；on my birthday；at 7:15；this week",
        "B. on winter；in my birthday；at 7:15；on this week",
        "C. in winter；at my birthday；on 7:15；in this week",
        "D. at winter；on my birthday；in 7:15；at this week"
      ],
      "answer": "A. in winter；on my birthday；at 7:15；this week",
      "answerDisplay": "A. in winter；on my birthday；at 7:15；this week",
      "correctFeedback": "正确。季节用 in，具体一天用 on，钟点用 at；this week 前不加介词。",
      "wrongFeedback": "逐个判断季节、具体一天、钟点和 this week。",
      "explanation": "先圈完整时间短语，再按范围、一天、时刻或无介词表达判断。",
      "bankItemId": "grammar-2026-08-06-time-prepositions-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-06-time-prepositions-review",
      "sourceChallengeDate": "2026-08-06",
      "sourceChallengeTitle": "时间介词快速挑战",
      "sourceLessonKey": "time-prepositions-in-on-at",
      "sourceLessonKpIds": [
        "time-prepositions-in-on-at"
      ],
      "kpIds": [
        "time-prepositions-in-on-at"
      ],
      "primaryKpId": "time-prepositions-in-on-at",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ca17f5a93dad2e223d96d291f3955d16b375d339be5388da8fdf9ed1146933dd",
      "variantGroupId": "time-prepositions-in-on-at::contrast"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC01",
      "category": "meaning",
      "categoryLabel": "数量还是顺序｜seven",
      "type": "single",
      "source": "seven books",
      "prompt": "seven 表示什么？",
      "options": [
        "数量",
        "顺序",
        "时间",
        "地点"
      ],
      "answer": "数量",
      "answerDisplay": "seven 表示数量。",
      "correctFeedback": "正确。seven 回答“多少本书”，是基数词。",
      "wrongFeedback": "先问它回答“多少”还是“第几”。",
      "explanation": "seven 回答“多少本书”，是基数词。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7078c82c0bac7bfd1a52027f2f20fb2fbbb433eaee1451aab3b8699cea732925",
      "variantGroupId": "cardinal-ordinal-numbers-basics::meaning"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC02",
      "category": "ordinal",
      "categoryLabel": "第几名｜second",
      "type": "single",
      "source": "Mia is the ___ runner.",
      "prompt": "选择正确答案。",
      "options": [
        "second",
        "two",
        "twelve",
        "twenty"
      ],
      "answer": "second",
      "answerDisplay": "Mia is the second runner.",
      "correctFeedback": "正确。the second runner 表示第二名。",
      "wrongFeedback": "the ___ runner 在问“第几名”。",
      "explanation": "表示顺序时使用序数词 second。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8fc04b0b6ec396c70d5756adab77ee64b4b8e415bdc234dcaaecc2ebfefff0fc",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC03",
      "category": "cardinal",
      "categoryLabel": "35 的拼写｜thirty-five",
      "type": "single",
      "prompt": "数字 35 的正确拼写是哪一个？",
      "options": [
        "thirty-five",
        "thirty five",
        "thirteen-five",
        "thirtieth-five"
      ],
      "answer": "thirty-five",
      "answerDisplay": "35 = thirty-five",
      "correctFeedback": "正确。非整十的 21—99 使用“十位 + 连字符 + 个位”。",
      "wrongFeedback": "检查十位、连字符和个位。",
      "explanation": "35 写作 thirty-five。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:2a316ff6d92666eb9521d77f2ce8cb7f1c57ae4650bafe26af7aa0bc81a1f5bb",
      "variantGroupId": "cardinal-ordinal-numbers-basics::cardinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC04",
      "category": "cardinal",
      "categoryLabel": "forty 易错｜forty-eight",
      "type": "single",
      "prompt": "数字 48 的正确拼写是哪一个？",
      "options": [
        "forty-eight",
        "fourty-eight",
        "fourteen-eight",
        "forty-eighth"
      ],
      "answer": "forty-eight",
      "answerDisplay": "48 = forty-eight",
      "correctFeedback": "正确。40 写作 forty，不是 fourty。",
      "wrongFeedback": "先检查 40 的正确拼写。",
      "explanation": "48 写作 forty-eight。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:6d320f15354aa44c16e73718a66c61cf571988d3112b61fb974b781604eea215",
      "variantGroupId": "cardinal-ordinal-numbers-basics::cardinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC05",
      "category": "cardinal",
      "categoryLabel": "具体数字后的 hundred",
      "type": "single",
      "prompt": "选择正确短语。",
      "options": [
        "two hundred students",
        "two hundreds students",
        "second hundred students",
        "two hundredth students"
      ],
      "answer": "two hundred students",
      "answerDisplay": "two hundred students",
      "correctFeedback": "正确。hundred 前有具体数字 two 时不加 s。",
      "wrongFeedback": "检查具体数字后的 hundred 是否加 s。",
      "explanation": "具体数字后的 hundred 不加 s。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:aceb2f29603cab44cc046b238f55be8b633eded6dd07828131880b9a8d7e07e9",
      "variantGroupId": "cardinal-ordinal-numbers-basics::cardinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC06",
      "category": "ordinal",
      "categoryLabel": "前三个序数词",
      "type": "single",
      "prompt": "哪一组全部正确？",
      "options": [
        "first / second / third",
        "oneth / twoth / threeth",
        "one / two / three",
        "first / twelfth / thirtieth"
      ],
      "answer": "first / second / third",
      "answerDisplay": "first / second / third",
      "correctFeedback": "正确。one / two / three 的序数词需要单独记忆。",
      "wrongFeedback": "回想最特殊的前三个序数词。",
      "explanation": "第一、第二、第三分别是 first、second、third。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9fd96e214f5b68529e33f0e92d99aaaed7d57871f0254444af3a98bf780aa829",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC07",
      "category": "ordinal",
      "categoryLabel": "特殊拼写｜fifth",
      "type": "single",
      "prompt": "five 的序数词是哪一个？",
      "options": [
        "fifth",
        "fiveth",
        "fifthth",
        "fifty"
      ],
      "answer": "fifth",
      "answerDisplay": "five → fifth",
      "correctFeedback": "正确。five 变成 fifth。",
      "wrongFeedback": "five 不能直接在完整单词后加 th。",
      "explanation": "five 的序数词是 fifth。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:efcdc57df969a11825f329dedafcd22651a871e53afbeb042e29a968f96d4b64",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC08",
      "category": "ordinal",
      "categoryLabel": "整十序数词｜twentieth",
      "type": "single",
      "prompt": "twenty 的序数词是哪一个？",
      "options": [
        "twentieth",
        "twenty-th",
        "twentyth",
        "twenty-first"
      ],
      "answer": "twentieth",
      "answerDisplay": "twenty → twentieth",
      "correctFeedback": "正确。整十数结尾 ty 常变为 tieth。",
      "wrongFeedback": "检查 ty 到 tieth 的变化。",
      "explanation": "twenty 的序数词是 twentieth。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:dc2fc4128fa891095ed56f449ca040a45808439328f0353cb183f1c512a5016b",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC09",
      "category": "ordinal",
      "categoryLabel": "几十几序数词｜twenty-first",
      "type": "single",
      "prompt": "twenty-one 的序数形式是哪一个？",
      "options": [
        "twenty-first",
        "twentieth-one",
        "twenty-oneth",
        "first-twenty"
      ],
      "answer": "twenty-first",
      "answerDisplay": "twenty-one → twenty-first",
      "correctFeedback": "正确。几十几表示顺序时，通常只变最后一个词。",
      "wrongFeedback": "记住“前基后序”。",
      "explanation": "twenty-one 的序数形式是 twenty-first。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:bf2be542ff66b8783905349df5584ad21b67cac3a9c08190ab5c0be8b654c4a9",
      "variantGroupId": "cardinal-ordinal-numbers-basics::ordinal"
    },
    {
      "id": "grammar-2026-08-04-cardinal-ordinal-review::GC10",
      "category": "method",
      "categoryLabel": "综合判断",
      "type": "single",
      "prompt": "哪一项全部正确？",
      "options": [
        "A. 12 = twelve；第 12 = twelfth；200 = two hundred",
        "B. 12 = twelfth；第 12 = twelve；200 = two hundreds",
        "C. 12 = twenteen；第 12 = twelveth；200 = second hundred",
        "D. 12 = twelve；第 12 = twelfth；200 = two hundredth students"
      ],
      "answer": "A. 12 = twelve；第 12 = twelfth；200 = two hundred",
      "answerDisplay": "A. 12 = twelve；第 12 = twelfth；200 = two hundred",
      "correctFeedback": "正确。数量用基数词，顺序用序数词；具体数字后的 hundred 不加 s。",
      "wrongFeedback": "分别检查数量、顺序和 hundred 的规则。",
      "explanation": "12 是 twelve，第 12 是 twelfth，200 是 two hundred。",
      "bankItemId": "grammar-2026-08-04-cardinal-ordinal-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-04-cardinal-ordinal-review",
      "sourceChallengeDate": "2026-08-04",
      "sourceChallengeTitle": "数字排队快速挑战",
      "sourceLessonKey": "cardinal-ordinal-numbers-basics",
      "sourceLessonKpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "kpIds": [
        "cardinal-ordinal-numbers-basics"
      ],
      "primaryKpId": "cardinal-ordinal-numbers-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:955c377f31d7fb87be2e5c5d9a660167b27b8dec6387d1806d1af2f35e113253",
      "variantGroupId": "cardinal-ordinal-numbers-basics::method"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC01",
      "category": "base",
      "categoryLabel": "找家长词｜care",
      "type": "single",
      "prompt": "哪一个是 careful / careless / carefully 共同关联的基础词？",
      "options": [
        "care",
        "car",
        "carry",
        "careful"
      ],
      "answer": "care",
      "answerDisplay": "care",
      "correctFeedback": "正确。这些词都围绕 care 的“关心、仔细”意义形成。",
      "wrongFeedback": "找共同的基础词和核心意义。",
      "explanation": "这些词都围绕 care 的“关心、仔细”意义形成。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:168c0b4816b707aa69e6a4558e8d7d714f1eb4f8125fbecf75500bd7d01b3f30",
      "variantGroupId": "word-family-basics::base"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC02",
      "category": "job",
      "categoryLabel": "形容词工作牌｜careful",
      "type": "single",
      "source": "Mia is a ___ painter.",
      "prompt": "选择正确答案。",
      "options": [
        "careful",
        "carefully",
        "care",
        "carelessly"
      ],
      "answer": "careful",
      "answerDisplay": "Mia is a careful painter.",
      "correctFeedback": "正确。名词 painter 前需要形容词 careful。",
      "wrongFeedback": "看看空格在说明人，还是说明动作。",
      "explanation": "careful 说明 painter 是什么样的。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:51fc5feb5ed440884bdc527d81a24eab112594b257b24e9b2dffdc053c35811d",
      "variantGroupId": "word-family-basics::job"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC03",
      "category": "job",
      "categoryLabel": "副词工作牌｜carefully",
      "type": "single",
      "source": "Mia paints ___.",
      "prompt": "选择正确答案。",
      "options": [
        "carefully",
        "careful",
        "care",
        "carefulness"
      ],
      "answer": "carefully",
      "answerDisplay": "Mia paints carefully.",
      "correctFeedback": "正确。carefully 说明动作 paints 怎样发生。",
      "wrongFeedback": "这里需要说明动作怎样发生。",
      "explanation": "carefully 是副词，说明 paints。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e09e36cacb122a3ba7fe87ff2f8ef502de2c085e8cd7c1448c1404039b1f02e6",
      "variantGroupId": "word-family-basics::job"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC04",
      "category": "suffix",
      "categoryLabel": "-ness 线索｜happiness",
      "type": "single",
      "prompt": "哪一个词最可能作名词？",
      "options": [
        "happiness",
        "happily",
        "happy",
        "beautiful"
      ],
      "answer": "happiness",
      "answerDisplay": "happiness",
      "correctFeedback": "正确。-ness 常提示名词。",
      "wrongFeedback": "回想表示一种状态或概念的词尾线索。",
      "explanation": "happiness 表示“快乐、幸福”这种状态。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7c3cb6c7862136470966d507bfd2950e0cab96e1afef500f8ee271fda8efe256",
      "variantGroupId": "word-family-basics::suffix"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC05",
      "category": "meaning",
      "categoryLabel": "相反方向｜useful / useless",
      "type": "single",
      "prompt": "哪一组是同族、但意思方向相反的形容词？",
      "options": [
        "useful / useless",
        "beautiful / beautifully",
        "happy / happiness",
        "care / carefully"
      ],
      "answer": "useful / useless",
      "answerDisplay": "useful / useless",
      "correctFeedback": "正确。两词都来自 use，意义方向相反。",
      "wrongFeedback": "找两个同为形容词、共同基础词相同的选项。",
      "explanation": "-ful 与 -less 让意义方向相反。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:2a0170053fc8aad6ee21df148619b847a2e33a02258486dbea6f9fa59c90ec22",
      "variantGroupId": "word-family-basics::meaning"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC06",
      "category": "job",
      "categoryLabel": "同族词不能乱换｜beautifully",
      "type": "single",
      "prompt": "选择正确句子。",
      "options": [
        "The bird sings beautifully.",
        "The bird sings beautiful.",
        "The beautifully bird sings.",
        "The bird beauty sings."
      ],
      "answer": "The bird sings beautifully.",
      "answerDisplay": "The bird sings beautifully.",
      "correctFeedback": "正确。说明动作 sings 应使用副词 beautifully。",
      "wrongFeedback": "检查哪个词在说明动作 sings。",
      "explanation": "beautifully 说明 sings 怎样发生。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c96be55379396c9e306adb99bd8aa71032530d554010f7451aa590ad2c23f2f8",
      "variantGroupId": "word-family-basics::job"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC07",
      "category": "job",
      "categoryLabel": "说明对象｜beautiful",
      "type": "single",
      "source": "It is a beautiful lake.",
      "prompt": "为什么 beautiful 是形容词？",
      "options": [
        "它说明 lake",
        "它说明 is 怎样发生",
        "它表示数量",
        "它表示顺序"
      ],
      "answer": "它说明 lake",
      "answerDisplay": "beautiful 说明 lake。",
      "correctFeedback": "正确。beautiful 说明名词 lake。",
      "wrongFeedback": "看看 beautiful 紧邻并说明哪个名词。",
      "explanation": "beautiful 承担形容词工作。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ddff6cc62eff01172f9cd807dfdcb039f8b59b6d0f54befe92a3708b0224bd1b",
      "variantGroupId": "word-family-basics::job"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC08",
      "category": "suffix",
      "categoryLabel": "-ly 会骗人｜friendly",
      "type": "single",
      "prompt": "哪一个以 -ly 结尾的词在句中仍是形容词？",
      "options": [
        "a friendly dog",
        "runs quickly",
        "works carefully",
        "sings beautifully"
      ],
      "answer": "a friendly dog",
      "answerDisplay": "a friendly dog",
      "correctFeedback": "正确。friendly 说明名词 dog。",
      "wrongFeedback": "不要只看词尾，要看它在说明谁。",
      "explanation": "friendly 在这里是形容词。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7065478e38ec1fde03a06516ec232c831aaa3c2599e03d5f8ee130f3888c7f27",
      "variantGroupId": "word-family-basics::suffix"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC09",
      "category": "base",
      "categoryLabel": "共同意义｜happy",
      "type": "single",
      "prompt": "happy / happily / happiness 的共同核心意义最接近哪一个？",
      "options": [
        "快乐",
        "使用",
        "美丽",
        "小心"
      ],
      "answer": "快乐",
      "answerDisplay": "快乐",
      "correctFeedback": "正确。同族词工作不同，但保留共同意义。",
      "wrongFeedback": "先找最熟悉的基础词 happy。",
      "explanation": "三个词都围绕“快乐”。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:bbb9757e0a06c6d900277d67ad74c850e630ecef505ee611790e1524796f0a89",
      "variantGroupId": "word-family-basics::base"
    },
    {
      "id": "grammar-2026-08-03-word-family-review::GC10",
      "category": "method",
      "categoryLabel": "综合判断｜happy / happily",
      "type": "single",
      "source": "The happy children laugh happily.",
      "prompt": "哪一项判断全部正确？",
      "options": [
        "A. happy 说明 children；happily 说明 laugh；两词同族但工作不同",
        "B. happy 和 happily 都说明 children",
        "C. happy 是副词，happily 是名词",
        "D. 两词意思完全无关"
      ],
      "answer": "A. happy 说明 children；happily 说明 laugh；两词同族但工作不同",
      "answerDisplay": "A. happy 说明 children；happily 说明 laugh；两词同族但工作不同",
      "correctFeedback": "正确。同族词保留共同意义，但要按句中工作选择形式。",
      "wrongFeedback": "分别检查两个词说明谁或哪个动作。",
      "explanation": "happy 是形容词，happily 是副词。",
      "bankItemId": "grammar-2026-08-03-word-family-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-03-word-family-review",
      "sourceChallengeDate": "2026-08-03",
      "sourceChallengeTitle": "词族侦探快速挑战",
      "sourceLessonKey": "word-family-basics",
      "sourceLessonKpIds": [
        "word-family-basics"
      ],
      "kpIds": [
        "word-family-basics"
      ],
      "primaryKpId": "word-family-basics",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f955b6831ed97c8a809fc51956fbb2d583c84fc86ab9305adbed65e549eb1ca0",
      "variantGroupId": "word-family-basics::method"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC01",
      "category": "action",
      "categoryLabel": "说明动作｜quietly",
      "type": "single",
      "source": "The fox jumps quietly.",
      "prompt": "quietly 在说明什么？",
      "options": [
        "fox",
        "jumps",
        "the",
        "没有说明对象"
      ],
      "answer": "jumps",
      "answerDisplay": "quietly 说明 jumps。",
      "correctFeedback": "正确。方式副词 quietly 说明跳这个动作怎样发生。",
      "wrongFeedback": "先找动作词，再问这个动作怎样发生。",
      "explanation": "方式副词 quietly 说明 jumps。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4fde6a9e21de68b0224d5d32c3b66046f261198e05474b93d6b40fc73f800246",
      "variantGroupId": "adverb-basics-ly::action"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC02",
      "category": "position",
      "categoryLabel": "动词后｜peacefully",
      "type": "single",
      "prompt": "选择正确句子。",
      "options": [
        "The baby sleeps peacefully.",
        "The baby peacefully sleeps.",
        "The peacefully baby sleeps.",
        "The baby sleeps peaceful."
      ],
      "answer": "The baby sleeps peacefully.",
      "answerDisplay": "The baby sleeps peacefully.",
      "correctFeedback": "正确。没有宾语时，本阶段优先把方式副词放在动作词后。",
      "wrongFeedback": "先找动作词 sleeps，再看方式副词的位置。",
      "explanation": "没有宾语时，本阶段优先使用“动词 + 方式副词”。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:983212df98241a2334a1f8e39572f463ad2246ecb5403c288e86becb1c95dfee",
      "variantGroupId": "adverb-basics-ly::position"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC03",
      "category": "position",
      "categoryLabel": "宾语后｜carefully",
      "type": "single",
      "source": "Lily opens the box ___.",
      "prompt": "选择正确答案。",
      "options": [
        "carefully",
        "careful",
        "care",
        "cares"
      ],
      "answer": "carefully",
      "answerDisplay": "Lily opens the box carefully.",
      "correctFeedback": "正确。有宾语 the box 时，方式副词放在宾语后。",
      "wrongFeedback": "这里要说明 opens 怎样发生，需要方式副词。",
      "explanation": "本阶段优先使用“动词 + 宾语 + 方式副词”。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:815986c99a15eed143530227f90cc1b0ee4ee80f2d34d7dbfab18134307478d0",
      "variantGroupId": "adverb-basics-ly::position"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC04",
      "category": "compare",
      "categoryLabel": "形容词与副词｜quiet / softly",
      "type": "single",
      "prompt": "选择正确句子。",
      "options": [
        "The quiet boy speaks softly.",
        "The quietly boy speaks soft.",
        "The boy is softly.",
        "The soft speaks boy."
      ],
      "answer": "The quiet boy speaks softly.",
      "answerDisplay": "The quiet boy speaks softly.",
      "correctFeedback": "正确。quiet 说明 boy，softly 说明 speaks。",
      "wrongFeedback": "分别检查说明人和说明动作的词。",
      "explanation": "形容词说明人或事物，方式副词说明动作。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7df4d9ce7eaa4e5e964128f8d5e9e736f7956be62f4bc7ef0294730e23b34c6f",
      "variantGroupId": "adverb-basics-ly::compare"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC05",
      "category": "formation",
      "categoryLabel": "happy 的变化｜happily",
      "type": "single",
      "source": "The children sing ___.",
      "prompt": "选择正确答案。",
      "options": [
        "happily",
        "happyly",
        "happy",
        "happiness"
      ],
      "answer": "happily",
      "answerDisplay": "The children sing happily.",
      "correctFeedback": "正确。happy 常变 y 为 i 再加 -ly。",
      "wrongFeedback": "先把 happy 的 y 变成 i。",
      "explanation": "辅音字母 + y 结尾时，常变 y 为 i 再加 -ly。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:3578d16e7a55e057e7633a58baecc80bf33744b13a8a9a725e13b74e8ebe540e",
      "variantGroupId": "adverb-basics-ly::formation"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC06",
      "category": "exceptions",
      "categoryLabel": "特殊搭档｜good 与 well",
      "type": "single",
      "prompt": "哪一组句子都正确？",
      "options": [
        "A. She is a good swimmer. She swims well.",
        "B. She is a well swimmer. She swims good.",
        "C. She is good swimmer. She well swims.",
        "D. She is a good swimmer. She swims good."
      ],
      "answer": "A. She is a good swimmer. She swims well.",
      "answerDisplay": "A. She is a good swimmer. She swims well.",
      "correctFeedback": "正确。good 说明人或事物，well 说明动作。",
      "wrongFeedback": "检查 swimmer 和 swims 分别需要什么词。",
      "explanation": "good 说明人或事物，well 说明动作。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:1d8e61407e0a4f336fca533c9d673e49e5b65c2ecf3bb4912f5406c950fa729d",
      "variantGroupId": "adverb-basics-ly::exceptions"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC07",
      "category": "exceptions",
      "categoryLabel": "同形副词｜fast",
      "type": "single",
      "prompt": "哪一句不需要给方式词加 -ly？",
      "options": [
        "The train moves fast.",
        "The train moves fastly.",
        "The train moves quick.",
        "The train is quickly."
      ],
      "answer": "The train moves fast.",
      "answerDisplay": "The train moves fast.",
      "correctFeedback": "正确。fast 作方式副词时常保持原形。",
      "wrongFeedback": "fast 作方式副词时不加 -ly。",
      "explanation": "fast 作方式副词时常保持原形。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:93e5f502b075029bde3cceee28c312c1ca30d108f701ccbfdf221e8cb739d95c",
      "variantGroupId": "adverb-basics-ly::exceptions"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC08",
      "category": "exceptions",
      "categoryLabel": "-ly 会骗人｜lovely",
      "type": "single",
      "prompt": "哪一个 -ly 结尾词在句中是形容词？",
      "options": [
        "a lovely garden",
        "walks slowly",
        "reads carefully",
        "smiles happily"
      ],
      "answer": "a lovely garden",
      "answerDisplay": "a lovely garden",
      "correctFeedback": "正确。lovely 放在名词 garden 前说明事物。",
      "wrongFeedback": "不要只看 -ly，要看它在说明谁。",
      "explanation": "lovely 在这里是形容词。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:23535bc0bd639dd97e76a5f3e9d9d4c342eab20f8b4b8a70082a43021d358068",
      "variantGroupId": "adverb-basics-ly::exceptions"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC09",
      "category": "action",
      "categoryLabel": "先找动作｜slowly",
      "type": "single",
      "source": "The careful nurse carries the glass slowly.",
      "prompt": "哪一个词说明 carries？",
      "options": [
        "careful",
        "nurse",
        "glass",
        "slowly"
      ],
      "answer": "slowly",
      "answerDisplay": "slowly 说明 carries。",
      "correctFeedback": "正确。先找动作 carries，再问“怎么拿”。",
      "wrongFeedback": "先找 carries，再看哪个词回答“怎么拿”。",
      "explanation": "slowly 说明 carries 怎样发生。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:5cc78ef0f2646d66cec228b7241dead44352022b38c01324168899f1b930388b",
      "variantGroupId": "adverb-basics-ly::action"
    },
    {
      "id": "grammar-2026-08-02-adverb-review::GC10",
      "category": "compare",
      "categoryLabel": "综合判断｜friendly / heavy / quietly",
      "type": "single",
      "source": "The friendly girl closes the heavy door quietly.",
      "prompt": "哪一组判断全部正确？",
      "options": [
        "A. friendly 说明 girl；heavy 说明 door；quietly 说明 closes",
        "B. 三个词都说明 closes",
        "C. friendly 和 quietly 都说明 girl",
        "D. heavy 是副词，quietly 是形容词"
      ],
      "answer": "A. friendly 说明 girl；heavy 说明 door；quietly 说明 closes",
      "answerDisplay": "A. friendly 说明 girl；heavy 说明 door；quietly 说明 closes",
      "correctFeedback": "正确。形容词说明人或事物，方式副词说明动作。",
      "wrongFeedback": "逐个检查三个词分别说明谁或哪个动作。",
      "explanation": "friendly 和 heavy 是形容词，quietly 是副词。",
      "bankItemId": "grammar-2026-08-02-adverb-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-08-02-adverb-review",
      "sourceChallengeDate": "2026-08-02",
      "sourceChallengeTitle": "副词侦探快速挑战",
      "sourceLessonKey": "adverb-basics-ly",
      "sourceLessonKpIds": [
        "adverb-basics-ly"
      ],
      "kpIds": [
        "adverb-basics-ly"
      ],
      "primaryKpId": "adverb-basics-ly",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ee2c4dd302a39bd72c2466b0a2240afea06a63e6a259d5f8a4b70a9236e2d28e",
      "variantGroupId": "adverb-basics-ly::compare"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC01",
      "category": "with_noun",
      "categoryLabel": "名词还在｜Lucy 的铅笔",
      "type": "single",
      "prompt": "Lucy has ___ pencil.",
      "options": [
        "her",
        "hers"
      ],
      "answer": "her",
      "answerDisplay": "Lucy has her pencil.",
      "correctFeedback": "正确。pencil 还在，前面用 her。",
      "wrongFeedback": "pencil 是名词，前面要用 her。",
      "explanation": "后面有名词，用 my 一队。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c5cff18c39ed3ce52e9072eca7a0c84587caa7ff54045cee461cd26b45a3a9be",
      "variantGroupId": "possessive-pronouns-basic::with_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC02",
      "category": "without_noun",
      "categoryLabel": "名词省掉｜铅笔是 Lucy 的",
      "type": "single",
      "prompt": "The pencil is ___.",
      "options": [
        "her",
        "hers"
      ],
      "answer": "hers",
      "answerDisplay": "The pencil is hers.",
      "correctFeedback": "正确。空格后没有名词，单独使用 hers。",
      "wrongFeedback": "空格后没有名词，her 不能单独停在句尾。",
      "explanation": "hers 代替 her pencil。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e1d46a3fba0424d6b4c22c710b505c0714b57c191d23586670d4a47d087f86cc",
      "variantGroupId": "possessive-pronouns-basic::without_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC03",
      "category": "with_noun",
      "categoryLabel": "名词还在｜Tom 的杯子",
      "type": "single",
      "prompt": "Tom drinks from ___ cup.",
      "options": [
        "his",
        "him"
      ],
      "answer": "his",
      "answerDisplay": "Tom drinks from his cup.",
      "correctFeedback": "正确。cup 是名词，前面用 his。",
      "wrongFeedback": "这里表示“他的杯子”，不是宾格 him。",
      "explanation": "his + cup 表示所属。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:57658a1c2bf1bbd37a8393446bc46c90eed326c334c4311b9d8ad0ab44683af2",
      "variantGroupId": "possessive-pronouns-basic::with_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC04",
      "category": "without_noun",
      "categoryLabel": "名词省掉｜杯子是 Tom 的",
      "type": "single",
      "prompt": "The blue cup is ___.",
      "options": [
        "he",
        "him",
        "his",
        "he's"
      ],
      "answer": "his",
      "answerDisplay": "The blue cup is his.",
      "correctFeedback": "正确。句尾单独表示“他的”用 his。",
      "wrongFeedback": "这里需要表示所属，不是主格、宾格或缩写。",
      "explanation": "his 两种形式拼写相同。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:2be6ebca88bef0ab6c5c04d33ccb19122089e3f5347dde3d1e6c09e2fba3df77",
      "variantGroupId": "possessive-pronouns-basic::without_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC05",
      "category": "with_noun",
      "categoryLabel": "名词还在｜我们的教室",
      "type": "single",
      "prompt": "We clean ___ classroom.",
      "options": [
        "our",
        "ours"
      ],
      "answer": "our",
      "answerDisplay": "We clean our classroom.",
      "correctFeedback": "正确。classroom 还在，名词前用 our。",
      "wrongFeedback": "ours 不能再直接接 classroom。",
      "explanation": "后面有名词，用 our。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7236c67d4d0bbbfe23749057b8b14a03d2ef954a5159a3412c65fd2df19531fe",
      "variantGroupId": "possessive-pronouns-basic::with_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC06",
      "category": "without_noun",
      "categoryLabel": "名词省掉｜教室是我们的",
      "type": "single",
      "prompt": "The classroom is ___.",
      "options": [
        "our",
        "ours"
      ],
      "answer": "ours",
      "answerDisplay": "The classroom is ours.",
      "correctFeedback": "正确。空格后没有名词，单独使用 ours。",
      "wrongFeedback": "our 后面需要名词，不能单独使用。",
      "explanation": "ours 代替 our classroom。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d4c21ac45548fcd31b16b69de632165e3d0b4ef28b78db915b76ae83e417809b",
      "variantGroupId": "possessive-pronouns-basic::without_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC07",
      "category": "boundary",
      "categoryLabel": "边界｜小猫的玩具",
      "type": "single",
      "prompt": "The cat plays with ___ toy.",
      "options": [
        "its",
        "it's"
      ],
      "answer": "its",
      "answerDisplay": "The cat plays with its toy.",
      "correctFeedback": "正确。这里表示“它的玩具”，用 its。",
      "wrongFeedback": "it's 是 it is / it has 的缩写。",
      "explanation": "名词 toy 前用 its。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:6576629f292778a78b3f7e294e8a7a9b3fafd2b9d1e046b1d19c14a78d80d4ef",
      "variantGroupId": "possessive-pronouns-basic::boundary"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC08",
      "category": "with_noun",
      "categoryLabel": "名词还在｜他们的足球",
      "type": "single",
      "prompt": "The boys kick ___ football.",
      "options": [
        "their",
        "theirs",
        "them",
        "they're"
      ],
      "answer": "their",
      "answerDisplay": "The boys kick their football.",
      "correctFeedback": "正确。football 还在，名词前用 their。",
      "wrongFeedback": "这里要表示“他们的足球”。",
      "explanation": "their + 名词；theirs 单独使用。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4cacab73a9f3d17364a516fd18613b1f57f6b4b13a9a607324c67b5b5206755b",
      "variantGroupId": "possessive-pronouns-basic::with_noun"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC09",
      "category": "boundary",
      "categoryLabel": "Whose｜复数回答",
      "type": "single",
      "prompt": "Whose books are these?",
      "options": [
        "They are their.",
        "They are theirs.",
        "It is theirs.",
        "They are them."
      ],
      "answer": "They are theirs.",
      "answerDisplay": "Whose books are these? — They are theirs.",
      "correctFeedback": "正确。复数用 They are，单独表示“他们的”用 theirs。",
      "wrongFeedback": "同时检查复数回答和名词性物主代词。",
      "explanation": "问句已经说出 books，回答时用 theirs。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:243b6f33bf478b2c32ec48436d44ca6fe77f5845340f4837f45fb38131f00f2a",
      "variantGroupId": "possessive-pronouns-basic::boundary"
    },
    {
      "id": "grammar-2026-07-30-possessive-pronouns-review::GC10",
      "category": "boundary",
      "categoryLabel": "两种说法｜my 与 mine",
      "type": "single",
      "prompt": "哪一组两个句子都正确？",
      "options": [
        "This is my kite. / The kite is mine.",
        "This is mine kite. / The kite is my.",
        "This is me kite. / The kite is I.",
        "This is my kite. / The kite is me."
      ],
      "answer": "This is my kite. / The kite is mine.",
      "answerDisplay": "This is my kite. / The kite is mine.",
      "correctFeedback": "正确。名词前用 my，名词省略后用 mine。",
      "wrongFeedback": "先分别看 kite 在不在。",
      "explanation": "my + 名词；mine 单独使用。",
      "bankItemId": "grammar-2026-07-30-possessive-pronouns-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-30-possessive-pronouns-review",
      "sourceChallengeDate": "2026-07-30",
      "sourceChallengeTitle": "my 还是 mine？快速挑战",
      "sourceLessonKey": "possessive-pronouns-basic",
      "sourceLessonKpIds": [
        "possessive-pronouns-basic"
      ],
      "kpIds": [
        "possessive-pronouns-basic"
      ],
      "primaryKpId": "possessive-pronouns-basic",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8bec66497d540349c6bdefa50ef4202df97d9f514e2baaec12b359f0bcd2a645",
      "variantGroupId": "possessive-pronouns-basic::boundary"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC01",
      "category": "subject",
      "categoryLabel": "主格｜谁会跑",
      "type": "single",
      "prompt": "___ can run fast.",
      "options": [
        "I",
        "Me"
      ],
      "answer": "I",
      "answerDisplay": "I can run fast.",
      "correctFeedback": "正确。做 run 动作的人用主格 I。",
      "wrongFeedback": "空格在 can run 前，是句子的主语位置。",
      "explanation": "动作前需要主格；me 通常放在动作后或介词后。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d6f1a55eb76b5b44187a415b9f2eb5966aabc5d007897e767dc0546599fc5f79",
      "variantGroupId": "subject-object-pronouns::subject"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC02",
      "category": "subject",
      "categoryLabel": "主格｜谁在帮助",
      "type": "single",
      "prompt": "___ helps Leo with the books.",
      "options": [
        "She",
        "Her",
        "Hers",
        "Him"
      ],
      "answer": "She",
      "answerDisplay": "She helps Leo with the books.",
      "correctFeedback": "正确。她是做 helps 动作的人，用主格 She。",
      "wrongFeedback": "先找谁在做动作，不要只看中文“她”。",
      "explanation": "谓语 helps 前需要主语；She 是主格。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:12324aff2e46ddd7edcd88b86a090addcf29f22518dd4525bb054a2a6748b8d1",
      "variantGroupId": "subject-object-pronouns::subject"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC03",
      "category": "subject",
      "categoryLabel": "主格｜谁处于状态",
      "type": "single",
      "prompt": "___ are happy today.",
      "options": [
        "We",
        "Us",
        "Them",
        "Her"
      ],
      "answer": "We",
      "answerDisplay": "We are happy today.",
      "correctFeedback": "正确。处于开心状态的人作主语，用 We。",
      "wrongFeedback": "are 前需要主格。",
      "explanation": "主格不仅能做动作，也能表示谁处于某种状态。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f15020255cb2aaac73d4b701e52e5a4a30fef812d81d49dee0a010c71815bd8a",
      "variantGroupId": "subject-object-pronouns::subject"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC04",
      "category": "object",
      "categoryLabel": "宾格｜妈妈帮助谁",
      "type": "single",
      "prompt": "Mum helps ___ after school.",
      "options": [
        "I",
        "me"
      ],
      "answer": "me",
      "answerDisplay": "Mum helps me after school.",
      "correctFeedback": "正确。动作 helps 落到“我”身上，用宾格 me。",
      "wrongFeedback": "空格在动作词后面。",
      "explanation": "问“帮助谁”，答案是动作接受者。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:1cde3da835c7cef1d8f642382638f927de473061cbd58b7b9ac46654f533f9a8",
      "variantGroupId": "subject-object-pronouns::object"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC05",
      "category": "object",
      "categoryLabel": "宾格｜我看见他",
      "type": "single",
      "prompt": "I can see ___ near the door.",
      "options": [
        "he",
        "him",
        "his",
        "himself"
      ],
      "answer": "him",
      "answerDisplay": "I can see him near the door.",
      "correctFeedback": "正确。see 的接受者用宾格 him。",
      "wrongFeedback": "这里不是“他看见”，而是“看见他”。",
      "explanation": "动作前用 he；动作后用 him。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8a7cb9526880a38484daeae2928d08787aab2274680e62a51e36d436ddaa5328",
      "variantGroupId": "subject-object-pronouns::object"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC06",
      "category": "object",
      "categoryLabel": "宾格｜老师叫他们",
      "type": "single",
      "prompt": "The teacher calls ___ into the classroom.",
      "options": [
        "they",
        "them",
        "their",
        "we"
      ],
      "answer": "them",
      "answerDisplay": "The teacher calls them into the classroom.",
      "correctFeedback": "正确。被老师叫的人用宾格 them。",
      "wrongFeedback": "问“老师叫谁”。",
      "explanation": "calls 后的对象用宾格。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7b1acbe2bc9b51f40fa3f46b5deb5504319143e9ceec1c1607a1193004e6381e",
      "variantGroupId": "subject-object-pronouns::object"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC07",
      "category": "preposition",
      "categoryLabel": "介词后｜with her",
      "type": "single",
      "prompt": "We play with ___ after school.",
      "options": [
        "she",
        "her",
        "hers",
        "they"
      ],
      "answer": "her",
      "answerDisplay": "We play with her after school.",
      "correctFeedback": "正确。介词 with 后用宾格 her。",
      "wrongFeedback": "看到 with，先检查后面是不是宾格。",
      "explanation": "基础路线是“介词后用宾格”。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:86e6efecb9547d59ebcf5c016a1292370ef6aa661e140279b0fdcb0e7076ba80",
      "variantGroupId": "subject-object-pronouns::preposition"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC08",
      "category": "swap",
      "categoryLabel": "角色互换｜两句对照",
      "type": "single",
      "prompt": "哪一组两个句子都正确？",
      "options": [
        "I help him. / He helps me.",
        "Me help he. / Him helps I.",
        "I help he. / He helps I.",
        "Him helps me. / Me help him."
      ],
      "answer": "I help him. / He helps me.",
      "answerDisplay": "I help him. / He helps me.",
      "correctFeedback": "正确。谁做动作就用主格，谁接受动作就用宾格。",
      "wrongFeedback": "两句要分别判断角色，不能只记固定顺序。",
      "explanation": "角色互换后，I/me 与 he/him 也随任务互换。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:71daf4817c30e2d305241b5a7924a4fec43a4782167b4744c9e5813b75aeefb7",
      "variantGroupId": "subject-object-pronouns::swap"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC09",
      "category": "correction",
      "categoryLabel": "纠错｜动作前后",
      "type": "single",
      "source": "Her sees we.",
      "prompt": "选择正确的改法。",
      "options": [
        "She sees us.",
        "Her sees us.",
        "She sees we.",
        "Hers sees ours."
      ],
      "answer": "She sees us.",
      "answerDisplay": "She sees us.",
      "correctFeedback": "正确。She 做动作，us 接受动作。",
      "wrongFeedback": "动作前和动作后要分别判断。",
      "explanation": "句首主语用主格 She；sees 后用宾格 us。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:6b7716b96614167c35e6dee629cc1be971a09c30e2c1ecd690564d1fbde6a86a",
      "variantGroupId": "subject-object-pronouns::correction"
    },
    {
      "id": "grammar-2026-07-27-subject-object-review::GC10",
      "category": "mixed",
      "categoryLabel": "综合｜野餐故事",
      "type": "single",
      "prompt": "Mia and Leo are at a picnic. ___ gives a ball to ___. Then ___ plays with ___.",
      "options": [
        "She / him / he / her",
        "Her / he / him / she",
        "She / he / him / her",
        "Her / him / he / she"
      ],
      "answer": "She / him / he / her",
      "answerDisplay": "Mia and Leo are at a picnic. She gives a ball to him. Then he plays with her.",
      "correctFeedback": "正确。She 和 he 做动作；him 与 her 位于 to / with 后。",
      "wrongFeedback": "每个空都单独判断它在动作前还是介词后。",
      "explanation": "She gives a ball to him.；He plays with her。",
      "bankItemId": "grammar-2026-07-27-subject-object-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-27-subject-object-review",
      "sourceChallengeDate": "2026-07-27",
      "sourceChallengeTitle": "主格 · 宾格复习挑战",
      "sourceLessonKey": "subject-object-pronouns",
      "sourceLessonKpIds": [
        "subject-object-pronouns"
      ],
      "kpIds": [
        "subject-object-pronouns"
      ],
      "primaryKpId": "subject-object-pronouns",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c21414b735c7ad69c06de22c4b21531f7b7738466352536cea5bc3c1d28be98e",
      "variantGroupId": "subject-object-pronouns::mixed"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC01",
      "category": "apostrophe",
      "categoryLabel": "撇号｜单数 's",
      "type": "single",
      "source": "艾米的书包",
      "prompt": "选择正确的表达。",
      "options": [
        "Amy bag",
        "Amys bag",
        "Amy's bag",
        "Amy' bag"
      ],
      "answer": "Amy's bag",
      "answerDisplay": "Amy's bag",
      "correctFeedback": "正确。单数人名后通常加 's。",
      "wrongFeedback": "撇号和 s 都不能丢。",
      "explanation": "Amy + 's + bag → Amy's bag。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:76d2382fa8c93d8c2dee86bb39911968cde77b84324c565d74d201d8bcc16f5b",
      "variantGroupId": "noun-possessive::apostrophe"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC02",
      "category": "apostrophe",
      "categoryLabel": "撇号｜规则复数 s'",
      "type": "single",
      "source": "多个女孩的书",
      "prompt": "选择正确的表达。",
      "options": [
        "the girl's books",
        "the girls books",
        "the girls's books",
        "the girls' books"
      ],
      "answer": "the girls' books",
      "answerDisplay": "the girls' books",
      "correctFeedback": "正确。girls 已经以 s 结尾，只加撇号。",
      "wrongFeedback": "先确认是多个女孩，再看词尾已有 s。",
      "explanation": "规则复数词尾已有 s，所有格只在末尾加 '。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:263ed7b1ab4446fdeca19737cf773e204f61258baf2c6f63c49324f1ce428bde",
      "variantGroupId": "noun-possessive::apostrophe"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC03",
      "category": "apostrophe",
      "categoryLabel": "撇号｜不规则复数",
      "type": "single",
      "source": "孩子们的玩具",
      "prompt": "选择正确的表达。",
      "options": [
        "the childrens toys",
        "the children's toys",
        "the childrens' toys",
        "the children toys"
      ],
      "answer": "the children's toys",
      "answerDisplay": "the children's toys",
      "correctFeedback": "正确。children 没有词尾 s，所以加完整的 's。",
      "wrongFeedback": "不要把 children 当成以 s 结尾的规则复数。",
      "explanation": "不规则复数无词尾 s 时，所有格仍加 's。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:54538f1a44bedb78b19fb44b54fbf32ac8490fc000622bab0545e57a21ceab3f",
      "variantGroupId": "noun-possessive::apostrophe"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC04",
      "category": "apostrophe",
      "categoryLabel": "撇号｜单复数辨析",
      "type": "single",
      "prompt": "哪一个短语表示“一个女孩的自行车”？",
      "options": [
        "the girls' bike",
        "the girl's bike",
        "the girls bike",
        "the girl's bikes are"
      ],
      "answer": "the girl's bike",
      "answerDisplay": "the girl's bike",
      "correctFeedback": "正确。girl's 表示一个女孩的。",
      "wrongFeedback": "看撇号前是 girl 还是复数 girls。",
      "explanation": "girl's 是单数所有格；girls' 是规则复数所有格。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:958ff5a88b67e888824545faa561636807d94b7133c5a2ece257bea9ddcb54d0",
      "variantGroupId": "noun-possessive::apostrophe"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC05",
      "category": "whose",
      "categoryLabel": "Whose｜问句语序",
      "type": "single",
      "prompt": "选择正确的问句。",
      "options": [
        "Whose is pencil this?",
        "Whose pencil this is?",
        "Whose pencil is this?",
        "Who pencil is this?"
      ],
      "answer": "Whose pencil is this?",
      "answerDisplay": "Whose pencil is this?",
      "correctFeedback": "正确。Whose 后面直接带要问的名词。",
      "wrongFeedback": "先把 Whose pencil 看成一个整体。",
      "explanation": "基础结构是 Whose + 名词 + is/are + this/that/these/those?",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:96973f61ec5a27533f6d90b8c4be08735a18d4aed2f8fb563acbf5e734446655",
      "variantGroupId": "noun-possessive::whose"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC06",
      "category": "whose",
      "categoryLabel": "Whose｜单数问答",
      "type": "single",
      "prompt": "Whose cap is this?",
      "options": [
        "It is Leo.",
        "It is Leo's.",
        "It is Leos.",
        "They are Leo's."
      ],
      "answer": "It is Leo's.",
      "answerDisplay": "Whose cap is this? - It is Leo's.",
      "correctFeedback": "正确。单数物品用 It is，所有者用名词所有格。",
      "wrongFeedback": "既要有所有格，也要让 It 与单数物品一致。",
      "explanation": "Leo's 在这里等于 Leo's cap。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d1d2f3598ed74a4ad96bb7362b8d938396294c1d2fc845147bed41ccfb16e9d8",
      "variantGroupId": "noun-possessive::whose"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC07",
      "category": "whose",
      "categoryLabel": "Whose｜复数问答",
      "type": "single",
      "prompt": "Whose books are these?",
      "options": [
        "It is the girls'.",
        "They are the girl's.",
        "They are the girls'.",
        "These is the girls'."
      ],
      "answer": "They are the girls'.",
      "answerDisplay": "Whose books are these? - They are the girls'.",
      "correctFeedback": "正确。复数物品用 They are，多个女孩用 girls'。",
      "wrongFeedback": "同时检查 They are 和撇号位置。",
      "explanation": "books 是复数；girls 是以 s 结尾的规则复数。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:0b556b159a6fd0f20cd4725faba279537b045a0753da3d001ea1dcbba1fc4e67",
      "variantGroupId": "noun-possessive::whose"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC08",
      "category": "of",
      "categoryLabel": "of｜部分与整体",
      "type": "single",
      "source": "桌子的一条腿",
      "prompt": "选择正确的短语。",
      "options": [
        "the table of the leg",
        "the leg of the table",
        "the table's of leg",
        "the leg the table of"
      ],
      "answer": "the leg of the table",
      "answerDisplay": "the leg of the table",
      "correctFeedback": "正确。部分放前面，整体放在 of 后面。",
      "wrongFeedback": "先问“哪一部分”，再说“哪个整体”。",
      "explanation": "基础结构是 部分 + of + 整体。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:5cb7d0c2131275a41dc90b18838d7aa4e4403238c7ced33635d52c7496397350",
      "variantGroupId": "noun-possessive::of"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC09",
      "category": "of",
      "categoryLabel": "'s 还是 of｜基础路线",
      "type": "single",
      "prompt": "哪一组表达更符合本课基础路线？",
      "options": [
        "Mia's bag / the handle of the basket",
        "the bag of Mia / the basket's handle of",
        "Mia bag / the handle the basket",
        "the Mia's bag / the basket of handle"
      ],
      "answer": "Mia's bag / the handle of the basket",
      "answerDisplay": "Mia's bag / the handle of the basket",
      "correctFeedback": "正确。人拥有东西优先 's；物体部分—整体优先 of。",
      "wrongFeedback": "先判断是“谁拥有”还是“物体的哪一部分”。",
      "explanation": "这是基础选择路线，不是英语中所有情况的绝对规则。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:b33ec691fe1f51ea2f4995b923e96d1ac73f69de085de1a4a3f58cb43a6592c4",
      "variantGroupId": "noun-possessive::of"
    },
    {
      "id": "grammar-2026-07-26-possessive-whose-of-review::GC10",
      "category": "mixed",
      "categoryLabel": "综合｜三条路线",
      "type": "single",
      "prompt": "哪一组三个表达都正确？",
      "options": [
        "the dog's ball / Whose pencil is this? / the walls of the classroom",
        "the dogs ball / Who pencil is this? / the classroom of walls",
        "the dog's ball / Whose is pencil this? / the walls the classroom of",
        "the dog' ball / Whose pencils is this? / the classroom's of walls"
      ],
      "answer": "the dog's ball / Whose pencil is this? / the walls of the classroom",
      "answerDisplay": "the dog's ball / Whose pencil is this? / the walls of the classroom",
      "correctFeedback": "正确。三种表达任务分别走对了路线。",
      "wrongFeedback": "逐个检查撇号、Whose 语序和 of 的前后顺序。",
      "explanation": "单数动物用 's；Whose 后带名词；部分—整体用 部分 + of + 整体。",
      "bankItemId": "grammar-2026-07-26-possessive-whose-of-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-26-possessive-whose-of-review",
      "sourceChallengeDate": "2026-07-26",
      "sourceChallengeTitle": "'s · Whose · of 复习挑战",
      "sourceLessonKey": "possession-choice",
      "sourceLessonKpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "kpIds": [
        "noun-possessive",
        "whose-questions",
        "of-part-whole"
      ],
      "primaryKpId": "noun-possessive",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:70bd51ca210260a72e0109baa8b3aa1251747695e64e6d2a7c9c871865a90348",
      "variantGroupId": "noun-possessive::mixed"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC01",
      "category": "can",
      "categoryLabel": "can｜动词原形",
      "type": "single",
      "prompt": "Mia can ___ very fast.",
      "options": [
        "runs",
        "run",
        "running",
        "to run"
      ],
      "answer": "run",
      "answerDisplay": "Mia can run very fast.",
      "correctFeedback": "正确。can 后面的动作词使用原形 run。",
      "wrongFeedback": "看到 can，先把后面的动作词还原。",
      "explanation": "情态动词 can 后直接接动词原形，不加三单、-ing 或 to。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e56505705996983f42055e89cb4d4cfe969520aeb5cecbb4abf1d6ab35bca546",
      "variantGroupId": "can::can"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC02",
      "category": "can",
      "categoryLabel": "can｜否定句",
      "type": "single",
      "source": "Leo can play chess.",
      "prompt": "选择正确的否定句。",
      "options": [
        "Leo doesn't can play chess.",
        "Leo can't plays chess.",
        "Leo can't play chess.",
        "Leo can not to play chess."
      ],
      "answer": "Leo can't play chess.",
      "answerDisplay": "Leo can't play chess.",
      "correctFeedback": "正确。can 自己变成 can't，动作词保持原形。",
      "wrongFeedback": "不需要 doesn't，也不要给 play 加 -s。",
      "explanation": "结构是主语 + can't + 动词原形。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9ac83657e30f83899729b3e4fb345efa56011f3e0ff27f8b9a8bdb31d1b59855",
      "variantGroupId": "can::can"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC03",
      "category": "can",
      "categoryLabel": "can｜简短回答",
      "type": "single",
      "prompt": "Can Amy ride a bike?",
      "options": [
        "Yes, she does.",
        "Yes, she is.",
        "Yes, she can.",
        "Yes, she rides."
      ],
      "answer": "Yes, she can.",
      "answerDisplay": "Can Amy ride a bike? — Yes, she can.",
      "correctFeedback": "正确。Can 问，用 can 回。",
      "wrongFeedback": "简短回答要保留问句中的情态动词。",
      "explanation": "正确简答为 Yes, she can.；否定为 No, she can't.",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:848f4ada1b20b5d0ca38ba06fb798ec2aaee1c9b8d7f3b5942a47af0326c17c0",
      "variantGroupId": "can::can"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC04",
      "category": "there",
      "categoryLabel": "there be｜单数用 is",
      "type": "single",
      "source": "桌上有一本书。",
      "prompt": "选择正确的句子。",
      "options": [
        "There are a book on the desk.",
        "There is a book on the desk.",
        "It is a book on the desk.",
        "The desk is a book."
      ],
      "answer": "There is a book on the desk.",
      "answerDisplay": "There is a book on the desk.",
      "correctFeedback": "正确。a book 是单数，使用 There is。",
      "wrongFeedback": "先判断这是“某处有……”，再看名词是一个还是多个。",
      "explanation": "存在句单数结构是 There is + 单数名词 + 地点。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:81222448e4f72943d4c504615c9037a6b531d77dc951f4b180946e9d94d4eed9",
      "variantGroupId": "can::there"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC05",
      "category": "there",
      "categoryLabel": "there be｜复数用 are",
      "type": "single",
      "prompt": "选择正确的句子。",
      "options": [
        "There is three chairs in the room.",
        "There are three chair in the room.",
        "There are three chairs in the room.",
        "There three chairs are in the room."
      ],
      "answer": "There are three chairs in the room.",
      "answerDisplay": "There are three chairs in the room.",
      "correctFeedback": "正确。three chairs 是复数，使用 There are。",
      "wrongFeedback": "数量是 three，名词和 be 动词都要检查。",
      "explanation": "复数结构是 There are + 复数名词 + 地点。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:5782f207ab2c52a0b09c6ac9bd33b7e53b02b37efd7caf1a5e8c4d218f10aea8",
      "variantGroupId": "can::there"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC06",
      "category": "there",
      "categoryLabel": "there be｜不可数用 is",
      "type": "single",
      "prompt": "选择正确的句子。",
      "options": [
        "There are some milk in the glass.",
        "There is some milk in the glass.",
        "There is some milks in the glass.",
        "There some milk is in the glass."
      ],
      "answer": "There is some milk in the glass.",
      "answerDisplay": "There is some milk in the glass.",
      "correctFeedback": "正确。milk 是不可数名词，基础结构使用 There is。",
      "wrongFeedback": "不可数名词在这里按单数形式处理。",
      "explanation": "结构是 There is + 不可数名词 + 地点。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:78dbe0885ec0d2e4ed7018d972294011e6300db4bc22c0ae310642a0147ed3d9",
      "variantGroupId": "can::there"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC07",
      "category": "there",
      "categoryLabel": "there be｜否定句",
      "type": "single",
      "prompt": "哪一组两个句子都正确？",
      "options": [
        "There isn't a cat here. / There aren't any books here.",
        "There doesn't a cat here. / There isn't any books here.",
        "There not is a cat here. / There don't have books here.",
        "There isn't cat here. / There aren't any book here."
      ],
      "answer": "There isn't a cat here. / There aren't any books here.",
      "answerDisplay": "There isn't a cat here. / There aren't any books here.",
      "correctFeedback": "正确。单数用 isn't，复数用 aren't。",
      "wrongFeedback": "同时检查 be 动词和后面的名词单复数。",
      "explanation": "there be 直接在 is / are 后加 not，不使用 do / does。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:a221b47c4d0df99525a23156ee34c32e83d6ca023163ec5d138d2c35170629dc",
      "variantGroupId": "can::there"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC08",
      "category": "there",
      "categoryLabel": "there be｜一般疑问句",
      "type": "single",
      "prompt": "哪一组问答正确？",
      "options": [
        "Is there a computer in the room? — Yes, there is.",
        "Does there a computer in the room? — Yes, it does.",
        "Is a computer there in the room? — Yes, there has.",
        "Are there a computer in the room? — Yes, there are."
      ],
      "answer": "Is there a computer in the room? — Yes, there is.",
      "answerDisplay": "Is there a computer in the room? — Yes, there is.",
      "correctFeedback": "正确。There is... 变问句为 Is there...?",
      "wrongFeedback": "直接把原句中的 is 提到 there 前面。",
      "explanation": "单数问句为 Is there...?，肯定简答为 Yes, there is.",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:99261d9ac6a615ddc0ee22f529357e8a96939095c1c4b58db84a9942dc89dc10",
      "variantGroupId": "can::there"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC09",
      "category": "it",
      "categoryLabel": "it｜虚位主语",
      "type": "single",
      "prompt": "哪一句中的 it 不指具体物品？",
      "options": [
        "I have a ball. It is red.",
        "It is seven o'clock.",
        "This is my dog. It is small.",
        "I see a box. It is open."
      ],
      "answer": "It is seven o'clock.",
      "answerDisplay": "It is seven o'clock.",
      "correctFeedback": "正确。说时间时，it 只是帮助句子有主语。",
      "wrongFeedback": "先找前文有没有一个具体物品可供 it 指代。",
      "explanation": "It is seven o'clock. 中的 it 是虚位主语；其他三句都指前面出现的具体事物。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f206d35899702159692cc9e0dd361a6119661cfcfc6c08be4f001d00ee9e6201",
      "variantGroupId": "can::it"
    },
    {
      "id": "grammar-2026-07-25-can-there-be-it-review::GC10",
      "category": "it",
      "categoryLabel": "综合｜三种结构",
      "type": "single",
      "prompt": "哪一组三个句子都正确？",
      "options": [
        "Lily can swim. / There are two birds in the tree. / It is Friday.",
        "Lily can swims. / There is two birds in the tree. / Is Friday.",
        "Lily does can swim. / There are two bird in the tree. / It are Friday.",
        "Lily can to swim. / There two birds are in the tree. / Today is it Friday."
      ],
      "answer": "Lily can swim. / There are two birds in the tree. / It is Friday.",
      "answerDisplay": "Lily can swim. / There are two birds in the tree. / It is Friday.",
      "correctFeedback": "正确。能力、存在和星期分别使用三条正确路线。",
      "wrongFeedback": "逐句判断表达任务，再检查各自的固定结构。",
      "explanation": "can 后用原形；复数 two birds 搭配 There are；说星期使用虚位主语 It is。",
      "bankItemId": "grammar-2026-07-25-can-there-be-it-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-25-can-there-be-it-review",
      "sourceChallengeDate": "2026-07-25",
      "sourceChallengeTitle": "can · there be · it 复习挑战",
      "sourceLessonKey": "can-there-be-it",
      "sourceLessonKpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "kpIds": [
        "can",
        "there-be",
        "impersonal-it"
      ],
      "primaryKpId": "can",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4327a1dfbdf7e215295e5d73b8211a890f2aac527165f708e3c284cb87d15eab",
      "variantGroupId": "can::it"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC01",
      "category": "meaning",
      "categoryLabel": "频率高低｜最高和最低",
      "type": "single",
      "prompt": "选择能正确补全两句话的一组。\nI ___ brush my teeth in the morning.（每天都做）\nI ___ fly to school.（一次也不）",
      "options": [
        "always / never",
        "never / always",
        "usually / often",
        "sometimes / usually"
      ],
      "answer": "always / never",
      "answerDisplay": "I always brush my teeth in the morning. / I never fly to school.",
      "correctFeedback": "正确。每天都做用 always，一次也不做用 never。",
      "wrongFeedback": "先固定两个端点：最高是 always，最低是 never。",
      "explanation": "always 表示总是；never 表示从不。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d923521c734074f56ee484d775d3862edded89287752ec2288b91ddbcd3a9065",
      "variantGroupId": "frequency-adverbs::meaning"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC02",
      "category": "meaning",
      "categoryLabel": "频率高低｜从高到低",
      "type": "single",
      "prompt": "哪一组是从“发生得最多”到“发生得最少”？",
      "options": [
        "always → usually → often → sometimes → never",
        "never → sometimes → often → usually → always",
        "always → often → never → usually → sometimes",
        "usually → always → sometimes → never → often"
      ],
      "answer": "always → usually → often → sometimes → never",
      "answerDisplay": "always → usually → often → sometimes → never",
      "correctFeedback": "正确。always 在最前，never 在最后。",
      "wrongFeedback": "先放好 always 和 never，再放中间三个词。",
      "explanation": "本课只记大致频率顺序，不要求背精确百分比。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ccf2612ee019cd8e0589a98817e8dfee6f8a0ffe9a3863e46ba7aac42fb4b208",
      "variantGroupId": "frequency-adverbs::meaning"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC03",
      "category": "position",
      "categoryLabel": "句中位置｜be 后",
      "type": "single",
      "prompt": "选择正确的句子。",
      "options": [
        "Mia is often ready for class.",
        "Mia often is ready for class.",
        "Mia is ready often for class.",
        "Mia does often ready for class."
      ],
      "answer": "Mia is often ready for class.",
      "answerDisplay": "Mia is often ready for class.",
      "correctFeedback": "正确。频度副词放在 is 后。",
      "wrongFeedback": "先找到 is，频度词紧跟在它后面。",
      "explanation": "结构是主语 + be + 频度副词 + 其他。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:df1b33015c994f4313142a9b4b2c0f64b8636749e358d9404611d5a3ba4ce6b0",
      "variantGroupId": "frequency-adverbs::position"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC04",
      "category": "position",
      "categoryLabel": "句中位置｜动作前",
      "type": "single",
      "prompt": "选择正确的句子。",
      "options": [
        "We usually play chess after dinner.",
        "We play usually chess after dinner.",
        "We are usually play chess after dinner.",
        "We usually plays chess after dinner."
      ],
      "answer": "We usually play chess after dinner.",
      "answerDisplay": "We usually play chess after dinner.",
      "correctFeedback": "正确。频度副词放在动作词 play 前。",
      "wrongFeedback": "这句话没有 be；找到动作词 play。",
      "explanation": "动作句结构是主语 + 频度副词 + 实义动词 + 其他。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:0498d9b36910f68cc63dea43fef90e080f3376e2e95d4b2fa52af39c5b1ed3c4",
      "variantGroupId": "frequency-adverbs::position"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC05",
      "category": "position",
      "categoryLabel": "句中位置｜第三人称单数",
      "type": "single",
      "prompt": "选择正确的句子。",
      "options": [
        "Leo often walks to school.",
        "Leo walks often to school.",
        "Leo often walk to school.",
        "Leo is often walks to school."
      ],
      "answer": "Leo often walks to school.",
      "answerDisplay": "Leo often walks to school.",
      "correctFeedback": "正确。often 放在动作前，Leo 后用 walks。",
      "wrongFeedback": "同时检查频度词位置和第三人称单数。",
      "explanation": "Leo 是第三人称单数，动作词使用 walks；often 放在动作前。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:54f7ee7cf7eff93f23d1ce392b241b1b0b36c110f6e0a33b74abd5023383b243",
      "variantGroupId": "frequency-adverbs::position"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC06",
      "category": "position",
      "categoryLabel": "句中位置｜Sometimes 句首",
      "type": "single",
      "prompt": "哪一组两个句子都正确？",
      "options": [
        "Amy sometimes reads in the park. / Sometimes Amy reads in the park.",
        "Amy reads sometimes in the park. / Sometimes reads Amy in the park.",
        "Amy is sometimes read in the park. / Sometimes Amy is read in the park.",
        "Amy sometimes read in the park. / Sometimes Amy reading in the park."
      ],
      "answer": "Amy sometimes reads in the park. / Sometimes Amy reads in the park.",
      "answerDisplay": "Amy sometimes reads in the park. / Sometimes Amy reads in the park.",
      "correctFeedback": "正确。sometimes 可放动作前，也可放句首。",
      "wrongFeedback": "句首变化只移动 sometimes，后面的句子结构不能乱。",
      "explanation": "Sometimes 放句首时，后面仍是完整陈述句。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:65fe24a82b0ec66e453942bf90c11d4c2e449b7590a476dc88eabd931f08564d",
      "variantGroupId": "frequency-adverbs::position"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC07",
      "category": "phrase",
      "categoryLabel": "时间短语｜every day",
      "type": "single",
      "prompt": "选择正确的表达：I read English ___ .",
      "options": [
        "every day",
        "everyday",
        "every days",
        "on every day"
      ],
      "answer": "every day",
      "answerDisplay": "I read English every day.",
      "correctFeedback": "正确。表示“每天”时用两个词 every day。",
      "wrongFeedback": "这里需要时间短语“每天”。",
      "explanation": "every day 是时间短语；everyday 通常作形容词。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:9adb7dc074cd39030fe9e61f7644ab0eee46df5a0bd87bfd4e2e87850cf0647a",
      "variantGroupId": "frequency-adverbs::phrase"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC08",
      "category": "question",
      "categoryLabel": "How often｜do 路线",
      "type": "single",
      "source": "回答：Every day.",
      "prompt": "选择能得到这个回答的正确问句。",
      "options": [
        "How often do you read English?",
        "How often are you read English?",
        "When do you read English every day?",
        "How often you read English?"
      ],
      "answer": "How often do you read English?",
      "answerDisplay": "How often do you read English? — Every day.",
      "correctFeedback": "正确。问频率用 How often，you 使用 do。",
      "wrongFeedback": "回答是频率；动作句还需要 do。",
      "explanation": "结构是 How often + do + you + 动词原形。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:808b1914c1a93b92cff1b0f8311cf07b7f428aba80d1681ac5df0f244abfda33",
      "variantGroupId": "frequency-adverbs::question"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC09",
      "category": "question",
      "categoryLabel": "How often｜does 路线",
      "type": "single",
      "source": "回答：Twice a week.",
      "prompt": "选择正确的问句。",
      "options": [
        "How often does Nina exercise?",
        "How often does Nina exercises?",
        "How often do Nina exercise?",
        "How often is Nina exercise?"
      ],
      "answer": "How often does Nina exercise?",
      "answerDisplay": "How often does Nina exercise? — Twice a week.",
      "correctFeedback": "正确。Nina 使用 does，exercise 保持原形。",
      "wrongFeedback": "看到 does，检查后面的动作词有没有还原。",
      "explanation": "does 承担三单标记，实义动词用原形。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8a2e0d7505c3263ec0ecb6b4dfed588bf99b1e4aacaae036645ee4192fa2d9d0",
      "variantGroupId": "frequency-adverbs::question"
    },
    {
      "id": "grammar-2026-07-24-frequency-review::GC10",
      "category": "times",
      "categoryLabel": "次数表达｜once / twice / times",
      "type": "single",
      "prompt": "哪一组问答正确？",
      "options": [
        "How often do they visit the library? — Three times a month.",
        "How often do they visit the library? — Three time a month.",
        "When do they visit the library? — Twice a week.",
        "How many do they visit the library? — Once a week."
      ],
      "answer": "How often do they visit the library? — Three times a month.",
      "answerDisplay": "How often do they visit the library? — Three times a month.",
      "correctFeedback": "正确。三次及以上用数字 + times。",
      "wrongFeedback": "检查问句是否问频率，以及 three 后是否用 times。",
      "explanation": "once 是一次，twice 是两次，三次及以上使用数字 + times。",
      "bankItemId": "grammar-2026-07-24-frequency-review::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-24-frequency-review",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "频度副词复习挑战",
      "sourceLessonKey": "frequency-adverbs",
      "sourceLessonKpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "kpIds": [
        "frequency-adverbs",
        "how-often"
      ],
      "primaryKpId": "frequency-adverbs",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:bed8a0586dc3c5418382858e71568553658c8f905fa02ceeaa8d9ee7d5ef565a",
      "variantGroupId": "frequency-adverbs::times"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC01",
      "category": "clue",
      "categoryLabel": "回答线索｜What",
      "type": "single",
      "prompt": "— ___ do you eat for breakfast?\n— Bread and eggs.",
      "options": [
        "What",
        "Who",
        "Where",
        "When"
      ],
      "answer": "What",
      "answerDisplay": "What do you eat for breakfast?",
      "correctFeedback": "正确。Bread and eggs 是食物内容，所以用 What。",
      "wrongFeedback": "先看回答在说什么东西，还是人物、地点或时间。",
      "explanation": "回答给出早餐内容，使用 What；主语 you 的动作句用 do。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:45ff49b8e136c2e9bc874fc52dcfc9cbb108f18dacde6186cf08e13b9504b26b",
      "variantGroupId": "wh-question-method::clue"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC02",
      "category": "clue",
      "categoryLabel": "回答线索｜Where",
      "type": "single",
      "prompt": "— ___ do Lily and Amy play after school?\n— In the park.",
      "options": [
        "Where",
        "When",
        "Why",
        "How"
      ],
      "answer": "Where",
      "answerDisplay": "Where do Lily and Amy play after school?",
      "correctFeedback": "正确。In the park 是地点回答，所以用 Where。",
      "wrongFeedback": "看到 in + 地点，先判断问题是不是在问哪里。",
      "explanation": "回答给出地点；Lily and Amy 相当于 they，所以用 do。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:0f4be113153018f56ea4c90626bb197a51ebe36aab19ebe610584b4a236724f0",
      "variantGroupId": "wh-question-method::clue"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC03",
      "category": "clue",
      "categoryLabel": "回答线索｜When",
      "type": "single",
      "prompt": "— ___ do they have English?\n— On Monday morning.",
      "options": [
        "Where",
        "When",
        "Why",
        "Who"
      ],
      "answer": "When",
      "answerDisplay": "When do they have English?",
      "correctFeedback": "正确。On Monday morning 是时间回答，所以用 When。",
      "wrongFeedback": "星期和时间段都属于时间信息。",
      "explanation": "回答给出英语课时间，使用 When；主语 they 使用 do。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e1efacb2bf668dac0dd6517b51a26d36f87817170e8fa7ccb670cb56c04903ec",
      "variantGroupId": "wh-question-method::clue"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC04",
      "category": "clue",
      "categoryLabel": "回答线索｜Why",
      "type": "single",
      "prompt": "— ___ does Nina walk to school?\n— Because she lives near the school.",
      "options": [
        "What",
        "Where",
        "Why",
        "How"
      ],
      "answer": "Why",
      "answerDisplay": "Why does Nina walk to school?",
      "correctFeedback": "正确。Because... 在说明原因，所以用 Why。",
      "wrongFeedback": "Because 通常在回答为什么。",
      "explanation": "Nina 是第三人称单数，使用 does，后面的 walk 保持原形。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:903e50e344dcba5aa07bbfd6a21f8b3fd3088932d3df4b5a94badbc9245afb82",
      "variantGroupId": "wh-question-method::clue"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC05",
      "category": "clue",
      "categoryLabel": "回答线索｜How",
      "type": "single",
      "prompt": "回答是 By bus. 选择正确问句。",
      "options": [
        "How does Ben go to the library?",
        "Where does Ben go to the library?",
        "Why does Ben go to the library?",
        "How does Ben goes to the library?"
      ],
      "answer": "How does Ben go to the library?",
      "answerDisplay": "How does Ben go to the library?",
      "correctFeedback": "正确。By bus 说明方式，所以用 How；does 后用 go。",
      "wrongFeedback": "同时检查回答类型和 does 后的动词形式。",
      "explanation": "By bus 回答方式；Ben 使用 does，实义动词还原为 go。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d148ddc18f456b7a935230686f1e81898c9503dbc0f666e96e1493dbbb1516c4",
      "variantGroupId": "wh-question-method::clue"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC06",
      "category": "route",
      "categoryLabel": "be 动词路线｜双检查",
      "type": "single",
      "source": "The cat is in my room. / Your grandfather is fine.",
      "prompt": "哪一组两个问句都正确？",
      "options": [
        "Where is the cat? / How is your grandfather?",
        "Where does the cat be? / How does your grandfather be?",
        "Where the cat is? / How are your grandfather?",
        "What is the cat? / Where is your grandfather?"
      ],
      "answer": "Where is the cat? / How is your grandfather?",
      "answerDisplay": "Where is the cat?\nHow is your grandfather?",
      "correctFeedback": "正确。be 动词句不加 do/does；your grandfather 用 is。",
      "wrongFeedback": "先判断句子里是否已有 is，再找真正主语。",
      "explanation": "be 动词直接放到主语前，不需要 do 或 does。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:a2cef4aaf86d33b6dc27a9c46c353d16c9a06d6af04e32bdb55a535467c415bb",
      "variantGroupId": "wh-question-method::route"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC07",
      "category": "route",
      "categoryLabel": "动作内容｜两个 do",
      "type": "single",
      "source": "You play chess after school.",
      "prompt": "对 play chess 提问，选择正确问句。",
      "options": [
        "What do you do after school?",
        "What you do after school?",
        "What does you do after school?",
        "What do you play chess after school?"
      ],
      "answer": "What do you do after school?",
      "answerDisplay": "What do you do after school?",
      "correctFeedback": "正确。第一个 do 帮助提问，第二个 do 表示做。",
      "wrongFeedback": "被问的是整个动作 play chess，不能继续留在问句中。",
      "explanation": "删去动作内容，用 What 替代；主语 you 使用助动词 do。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:24e2a561e4d3ba1651d2be27f2281d50c39177567b98846d1abc3b60c6d11aa4",
      "variantGroupId": "wh-question-method::route"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC08",
      "category": "base",
      "categoryLabel": "does 后原形｜play",
      "type": "single",
      "source": "Tom plays football in the park.",
      "prompt": "对 in the park 提问，选择正确问句。",
      "options": [
        "Where does Tom play football?",
        "Where does Tom plays football?",
        "Where do Tom play football?",
        "Where is Tom play football?"
      ],
      "answer": "Where does Tom play football?",
      "answerDisplay": "Where does Tom play football?",
      "correctFeedback": "正确。Tom 使用 does，plays 还原为 play。",
      "wrongFeedback": "看到 does 后，检查实义动词是否为原形。",
      "explanation": "地点用 Where；does 已承担三单标记，后面用 play。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:fc75bb21c7b239f3b4f73f216ba361f511ae2aaee6739d0e42f934ee7d356fa4",
      "variantGroupId": "wh-question-method::base"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC09",
      "category": "base",
      "categoryLabel": "does 后原形｜have",
      "type": "single",
      "source": "Lily has a blue notebook.",
      "prompt": "对 a blue notebook 提问，选择正确问句。",
      "options": [
        "What does Lily have?",
        "What does Lily has?",
        "What do Lily have?",
        "What Lily has?"
      ],
      "answer": "What does Lily have?",
      "answerDisplay": "What does Lily have?",
      "correctFeedback": "正确。has 的原形是 have。",
      "wrongFeedback": "Lily 用 does；does 后不能保留 has。",
      "explanation": "物品用 What；Lily 使用 does，has 还原为 have。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:1c53203da3a7ce2bd7cc7773f77ad1a317d1468ded4ed1ebef78e3bd8c33c376",
      "variantGroupId": "wh-question-method::base"
    },
    {
      "id": "grammar-2026-07-24-special-questions::GC10",
      "category": "who",
      "categoryLabel": "Who 作主语｜不加 does",
      "type": "single",
      "source": "Jenny goes to school at eight o'clock.",
      "prompt": "对 Jenny 提问，选择正确问句。",
      "options": [
        "Who goes to school at eight o'clock?",
        "Who does go to school at eight o'clock?",
        "Who does Jenny go to school at eight o'clock?",
        "When does Jenny go to school?"
      ],
      "answer": "Who goes to school at eight o'clock?",
      "answerDisplay": "Who goes to school at eight o'clock?",
      "correctFeedback": "正确。Who 替代 Jenny，直接站在主语位置，不加 does。",
      "wrongFeedback": "先判断被问走的是不是原句主语。",
      "explanation": "Who 作主语时保持陈述语序，并保留三单动词 goes。",
      "bankItemId": "grammar-2026-07-24-special-questions::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-24-special-questions",
      "sourceChallengeDate": "2026-07-24",
      "sourceChallengeTitle": "特殊疑问句专项课｜语法挑战",
      "sourceLessonKey": "wh-question-method",
      "sourceLessonKpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "kpIds": [
        "wh-question-method",
        "what-who-where",
        "how-many-much"
      ],
      "primaryKpId": "wh-question-method",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:13fcabb81b63f0c1b6b90ee44b1461e2c59d1c4af4440ee4cc9679240d4bb2e3",
      "variantGroupId": "wh-question-method::who"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC01",
      "category": "negative",
      "categoryLabel": "否定句｜don't 还是 doesn't",
      "type": "single",
      "prompt": "My parents ___ work on Sundays.",
      "options": [
        "don't",
        "doesn't",
        "aren't",
        "isn't"
      ],
      "answer": "don't",
      "answerDisplay": "My parents don't work on Sundays.",
      "correctFeedback": "正确。My parents 是复数主语，与 don't 搭配。",
      "wrongFeedback": "再看主语。两位家长相当于 they。",
      "explanation": "I / you / we / they 和复数主语使用 don't + 动词原形，因此是 don't work。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC01",
      "sourceQuestionId": "GC01",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:4fdd070241bfd3f0120908e87640b7aac67cb613ca41f0992255cd381d05b882",
      "variantGroupId": "simple-present-use::negative"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC02",
      "category": "negative",
      "categoryLabel": "否定句｜三单主语",
      "type": "single",
      "prompt": "The dog ___ sleep on the sofa.",
      "options": [
        "don't",
        "doesn't",
        "isn't",
        "not"
      ],
      "answer": "doesn't",
      "answerDisplay": "The dog doesn't sleep on the sofa.",
      "correctFeedback": "正确。The dog 相当于 it。",
      "wrongFeedback": "再看主语。一个东西属于第三人称单数。",
      "explanation": "The dog 是单数主语，否定句使用 doesn't + 动词原形，所以是 doesn't sleep。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC02",
      "sourceQuestionId": "GC02",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8a2c477cae8d718477b8764521f8bc96a8d1a260bbc80b4c44f5b80fa9eea535",
      "variantGroupId": "simple-present-use::negative"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC03",
      "category": "negative",
      "categoryLabel": "肯定变否定｜动词还原",
      "type": "single",
      "source": "Lucy watches TV after dinner.",
      "prompt": "选择正确的否定句。",
      "rule": "WATCHES → DOESN'T WATCH（doesn't 后用动词原形）",
      "options": [
        "Lucy doesn't watch TV after dinner.",
        "Lucy don't watch TV after dinner.",
        "Lucy doesn't watches TV after dinner.",
        "Lucy isn't watch TV after dinner."
      ],
      "answer": "Lucy doesn't watch TV after dinner.",
      "answerDisplay": "Lucy doesn't watch TV after dinner.",
      "correctFeedback": "正确。doesn't 出现后，watches 还原为 watch。",
      "wrongFeedback": "检查两件事：Lucy 用什么助动词？助动词后动词是什么形式？",
      "explanation": "Lucy 是单数主语，所以用 doesn't；三单标记已经放在 doesn't 上，实义动词必须用原形 watch。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC03",
      "sourceQuestionId": "GC03",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:41259bb5737829b686a10bc8907aa28d3390e2dd4a0a9c8c8cb4173646fcc6e6",
      "variantGroupId": "simple-present-use::negative"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC04",
      "category": "question",
      "categoryLabel": "一般疑问句｜Do",
      "type": "single",
      "prompt": "___ you read English books every day?",
      "options": [
        "Do",
        "Does",
        "Are",
        "Is"
      ],
      "answer": "Do",
      "answerDisplay": "Do you read English books every day?",
      "correctFeedback": "正确。you 构成一般疑问句时使用 Do。",
      "wrongFeedback": "先找主语。you 不使用 Does。",
      "explanation": "I / you / we / they 使用 Do + 主语 + 动词原形。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC04",
      "sourceQuestionId": "GC04",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:80fa8873ed96b02c87d8cb024184c86c0a157db3dffa221d451f32724c97e2f4",
      "variantGroupId": "simple-present-use::question"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC05",
      "category": "question",
      "categoryLabel": "一般疑问句｜Does",
      "type": "single",
      "prompt": "___ Tom play football after school?",
      "options": [
        "Do",
        "Does",
        "Is",
        "Has"
      ],
      "answer": "Does",
      "answerDisplay": "Does Tom play football after school?",
      "correctFeedback": "正确。Tom 是一个人，相当于 he。",
      "wrongFeedback": "先找主语。单数人名使用 Does。",
      "explanation": "Tom 是第三人称单数，使用 Does + Tom + 动词原形。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC05",
      "sourceQuestionId": "GC05",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:e5d44510dd6a3228abcf1411d065f0ddae91ea52cc1e7bad6df85ee20ac24f3f",
      "variantGroupId": "simple-present-use::question"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC06",
      "category": "question",
      "categoryLabel": "肯定变疑问｜has 还原",
      "type": "single",
      "source": "She has lunch at school.",
      "prompt": "选择正确的一般疑问句。",
      "rule": "HAS → DOES ... HAVE（Does 后用动词原形）",
      "options": [
        "Does she have lunch at school?",
        "Does she has lunch at school?",
        "Do she have lunch at school?",
        "Is she have lunch at school?"
      ],
      "answer": "Does she have lunch at school?",
      "answerDisplay": "Does she have lunch at school?",
      "correctFeedback": "正确。has 的原形是 have。",
      "wrongFeedback": "Does 已经承担三单变化，后面要用原形。",
      "explanation": "主语 she 使用 Does；助动词出现后，has 还原为 have。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC06",
      "sourceQuestionId": "GC06",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:58f74a88e69f05b56652e6ad35add1cfee71e913819307aa7c972a08e2464114",
      "variantGroupId": "simple-present-use::question"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC07",
      "category": "short",
      "categoryLabel": "简短回答｜Do 问 do 答",
      "type": "single",
      "prompt": "Do Lily and Amy study English after school?",
      "options": [
        "Yes, they do.",
        "Yes, they does.",
        "Yes, she does.",
        "Yes, they are."
      ],
      "answer": "Yes, they do.",
      "answerDisplay": "Yes, they do.",
      "correctFeedback": "正确。两个人用 they，Do 问用 do 答。",
      "wrongFeedback": "先把 Lily and Amy 换成代词，再看问句开头。",
      "explanation": "Lily and Amy 相当于 they；肯定简短回答是 Yes, they do.",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC07",
      "sourceQuestionId": "GC07",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:b7d003c2ae441f5c72d6515cd50fef233aaf084d548fabc5bbf3ce57406d2870",
      "variantGroupId": "simple-present-use::short"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC08",
      "category": "short",
      "categoryLabel": "简短回答｜Does 问 doesn't 答",
      "type": "single",
      "prompt": "Does your brother get up at six?",
      "options": [
        "No, he doesn't.",
        "No, he don't.",
        "No, he isn't.",
        "No, your brother doesn't gets."
      ],
      "answer": "No, he doesn't.",
      "answerDisplay": "No, he doesn't.",
      "correctFeedback": "正确。your brother 用 he，Does 问用 doesn't 否定回答。",
      "wrongFeedback": "简短回答不重复实义动词。",
      "explanation": "your brother 相当于 he；否定简短回答为 No, he doesn't.",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC08",
      "sourceQuestionId": "GC08",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:cd2f1611fd23d6fac1179bc1e2b561f3d486ec1e41b64a5a5656e2b2cbffb6d5",
      "variantGroupId": "simple-present-use::short"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC09",
      "category": "correction",
      "categoryLabel": "综合纠错｜Does 后用原形",
      "type": "single",
      "source": "Does the girl likes music?",
      "prompt": "选择正确改法。",
      "options": [
        "Does the girl like music?",
        "Do the girl like music?",
        "Does the girl likes music?",
        "Is the girl like music?"
      ],
      "answer": "Does the girl like music?",
      "answerDisplay": "Does the girl like music?",
      "correctFeedback": "正确。Does 后使用原形 like。",
      "wrongFeedback": "助动词和实义动词不能同时保留三单标记。",
      "explanation": "the girl 是单数，使用 Does；后面的动词必须是原形 like。",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC09",
      "sourceQuestionId": "GC09",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:239fce281289375c4e5772a01b3612ed31e627178217ff8c2c86caa0f68a9eed",
      "variantGroupId": "simple-present-use::correction"
    },
    {
      "id": "grammar-2026-07-23-simple-present-2::GC10",
      "category": "combined",
      "categoryLabel": "两步转换｜否定句 + 一般疑问句",
      "type": "single",
      "source": "Ben goes to the library on Saturdays.",
      "prompt": "哪一组“否定句 + 一般疑问句”全部正确？",
      "options": [
        "Ben doesn't go to the library on Saturdays. / Does Ben go to the library on Saturdays?",
        "Ben don't go to the library on Saturdays. / Do Ben go to the library on Saturdays?",
        "Ben doesn't goes to the library on Saturdays. / Does Ben goes to the library on Saturdays?",
        "Ben isn't go to the library on Saturdays. / Is Ben go to the library on Saturdays?"
      ],
      "answer": "Ben doesn't go to the library on Saturdays. / Does Ben go to the library on Saturdays?",
      "answerDisplay": "Ben doesn't go to the library on Saturdays. / Does Ben go to the library on Saturdays?",
      "correctFeedback": "正确。Ben 用 doesn't / Does，goes 都还原为 go。",
      "wrongFeedback": "同时检查助动词和动词原形。",
      "explanation": "Ben 是第三人称单数。否定句使用 doesn't go，一般疑问句使用 Does Ben go...?",
      "bankItemId": "grammar-2026-07-23-simple-present-2::GC10",
      "sourceQuestionId": "GC10",
      "sourceChallengeId": "grammar-2026-07-23-simple-present-2",
      "sourceChallengeDate": "2026-07-23",
      "sourceChallengeTitle": "一般现在时第二课｜语法挑战",
      "sourceLessonKey": "simple-present-negative-question",
      "sourceLessonKpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "kpIds": [
        "simple-present-use",
        "simple-present-negative-question"
      ],
      "primaryKpId": "simple-present-use",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:70cb8325fa95d233369623d9b77df7a7cb7b768f30c325884f67e46277e7caac",
      "variantGroupId": "simple-present-use::combined"
    },
    {
      "id": "grammar-2026-07-17-articles::AR01",
      "category": "choice",
      "categoryLabel": "a / an｜看发音",
      "type": "single",
      "prompt": "Mia wants to be ___ engineer when she grows up.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "an",
      "wrongFeedback": "engineer 的开头读元音音素。",
      "explanation": "engineer 以元音音素开头，所以用 an。",
      "bankItemId": "grammar-2026-07-17-articles::AR01",
      "sourceQuestionId": "AR01",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:112c29075dad809f5999fa7d98b0f73c5eacbed0729e94794afb4285ae03d411",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR02",
      "category": "choice",
      "categoryLabel": "a / an｜易混发音",
      "type": "single",
      "prompt": "Leo is ___ university student.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "a",
      "wrongFeedback": "university 的开头读 /juː/，第一个音是辅音音素 /j/。",
      "explanation": "university 虽然以字母 u 开头，但读音以辅音音素 /j/ 开头，所以用 a。",
      "bankItemId": "grammar-2026-07-17-articles::AR02",
      "sourceQuestionId": "AR02",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f0d4447aa7a43eed37343c9f5ee98cf6e2e43fb2e7320e307c1a0c0c2a489c91",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR03",
      "category": "choice",
      "categoryLabel": "a / an｜不发音字母",
      "type": "single",
      "prompt": "We waited for ___ hour outside the museum.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "an",
      "wrongFeedback": "hour 中的 h 不发音，开头是元音音素。",
      "explanation": "hour 的开头读元音音素，所以用 an。",
      "bankItemId": "grammar-2026-07-17-articles::AR03",
      "sourceQuestionId": "AR03",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:891008dd3e912000e9eeba529ac7ce4caf5325da1bfbae716af1908db7d42b78",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR04",
      "category": "choice",
      "categoryLabel": "a / an｜易混发音",
      "type": "single",
      "prompt": "Dad bought ___ useful tool for the garden.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "a",
      "wrongFeedback": "useful 的开头读 /juː/，不是元音音素开头。",
      "explanation": "useful 以辅音音素 /j/ 开头，所以用 a。",
      "bankItemId": "grammar-2026-07-17-articles::AR04",
      "sourceQuestionId": "AR04",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:7cc562b1a41a4fbcee9114c415d7939b0d41a4ace8110f903abbc6c6145aa384",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR05",
      "category": "choice",
      "categoryLabel": "the｜再次提到",
      "type": "single",
      "source": "I saw a small dog near the gate.",
      "prompt": "___ dog followed me home.",
      "options": [
        "A",
        "An",
        "The",
        "不填"
      ],
      "answer": "The",
      "wrongFeedback": "这只狗已经在上一句出现过。",
      "explanation": "同一个事物再次提到时，用 the。",
      "bankItemId": "grammar-2026-07-17-articles::AR05",
      "sourceQuestionId": "AR05",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:d628ecf56e6671b510e1d32ee0f00875ba6c1800eb97c7e0666c97d0cc0f1fe8",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR06",
      "category": "choice",
      "categoryLabel": "the｜独一无二",
      "type": "single",
      "prompt": "___ sun gives us light and heat.",
      "options": [
        "A",
        "An",
        "The",
        "不填"
      ],
      "answer": "The",
      "wrongFeedback": "太阳是独一无二的事物。",
      "explanation": "独一无二的事物前通常用 the：the sun。",
      "bankItemId": "grammar-2026-07-17-articles::AR06",
      "sourceQuestionId": "AR06",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ffab3600d9e0996776a5da3d5f1131c1d00713c18cb3fc7098047408ac2477e5",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR07",
      "category": "choice",
      "categoryLabel": "零冠词｜三餐",
      "type": "single",
      "prompt": "We usually have ___ breakfast at seven.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "不填",
      "wrongFeedback": "普通三餐名称前通常不用冠词。",
      "explanation": "表示日常的一餐时用零冠词：have breakfast。",
      "bankItemId": "grammar-2026-07-17-articles::AR07",
      "sourceQuestionId": "AR07",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ff7f9d88d2d4fa9bd40867883a13a0a14b5be57c7c0a1de20f763da8cbe67af4",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR08",
      "category": "choice",
      "categoryLabel": "零冠词｜球类",
      "type": "single",
      "prompt": "My cousins play ___ basketball after school.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "不填",
      "wrongFeedback": "球类运动名称前通常不用冠词。",
      "explanation": "球类前用零冠词：play basketball。",
      "bankItemId": "grammar-2026-07-17-articles::AR08",
      "sourceQuestionId": "AR08",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:04207723d8faa9f55d8d6ba7992901fc12768d43c47a4c66652ce3175d1c225c",
      "variantGroupId": "articles::choice"
    },
    {
      "id": "grammar-2026-07-17-articles::AR09",
      "category": "context",
      "categoryLabel": "完整句辨析｜球类与乐器",
      "type": "single",
      "prompt": "选择冠词使用完全正确的句子。",
      "options": [
        "My sister plays the violin, and I play football.",
        "My sister plays violin, and I play the football.",
        "My sister plays a violin, and I play a football.",
        "My sister plays the violin, and I play the football."
      ],
      "answer": "My sister plays the violin, and I play football.",
      "wrongFeedback": "西洋乐器前通常加 the；球类前通常不加冠词。",
      "explanation": "正确搭配是 play the violin 和 play football。",
      "bankItemId": "grammar-2026-07-17-articles::AR09",
      "sourceQuestionId": "AR09",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:ba7ae7459bab38b0aaa46cd7fd8915b757f087dc21a59000472980fd87a9cadc",
      "variantGroupId": "articles::context"
    },
    {
      "id": "grammar-2026-07-17-articles::AR10",
      "category": "context",
      "categoryLabel": "完整句辨析｜科目",
      "type": "single",
      "prompt": "选择冠词使用正确的句子。",
      "options": [
        "English is my favourite subject.",
        "The English is my favourite subject.",
        "An English is my favourite subject.",
        "A English is my favourite subject."
      ],
      "answer": "English is my favourite subject.",
      "wrongFeedback": "科目名称前通常不用冠词。",
      "explanation": "English 表示学科时使用零冠词。",
      "bankItemId": "grammar-2026-07-17-articles::AR10",
      "sourceQuestionId": "AR10",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f84c2d42bf3a7783631f67670eb2d1c150121d23ed07508be5c7be5053439c5e",
      "variantGroupId": "articles::context"
    },
    {
      "id": "grammar-2026-07-17-articles::AR11",
      "category": "context",
      "categoryLabel": "固定搭配｜时间",
      "type": "single",
      "prompt": "选择正确的句子。",
      "options": [
        "I read in the morning.",
        "I read in morning.",
        "I read in a morning.",
        "I read in an morning."
      ],
      "answer": "I read in the morning.",
      "wrongFeedback": "“在早上”是固定搭配 in the morning。",
      "explanation": "固定搭配：in the morning。",
      "bankItemId": "grammar-2026-07-17-articles::AR11",
      "sourceQuestionId": "AR11",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:91eda070e2bdbeeec452df87684a36d64868389d889fc5ea20ace87c39f309d1",
      "variantGroupId": "articles::context"
    },
    {
      "id": "grammar-2026-07-17-articles::AR12",
      "category": "context",
      "categoryLabel": "the｜序数词",
      "type": "single",
      "prompt": "Ben is ___ first student to finish the task.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "the",
      "wrongFeedback": "序数词 first 前通常使用 the。",
      "explanation": "序数词前用 the：the first student。",
      "bankItemId": "grammar-2026-07-17-articles::AR12",
      "sourceQuestionId": "AR12",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:8f55671e64e5b98f3a0964484ced258851c102dd87d2ba4d38f9a55016efa471",
      "variantGroupId": "articles::context"
    },
    {
      "id": "grammar-2026-07-17-articles::AR13",
      "category": "context",
      "categoryLabel": "零冠词｜国家",
      "type": "single",
      "prompt": "My aunt lives in ___ China and works in ___ city near the sea.",
      "options": [
        "不填；a",
        "the；a",
        "不填；the",
        "a；the"
      ],
      "answer": "不填；a",
      "wrongFeedback": "国家名 China 前通常不加冠词；第一次提到一座城市用 a。",
      "explanation": "China 使用零冠词；a city 表示一座尚未特指的城市。",
      "bankItemId": "grammar-2026-07-17-articles::AR13",
      "sourceQuestionId": "AR13",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:44f8472e3738f46572a148c26767c3817ac1f14e19b7931dfaae1c4c702e4a00",
      "variantGroupId": "articles::context"
    },
    {
      "id": "grammar-2026-07-17-articles::AR14",
      "category": "context",
      "categoryLabel": "语境判断｜一顿丰盛早餐",
      "type": "single",
      "prompt": "We had ___ big breakfast before the trip.",
      "options": [
        "a",
        "an",
        "the",
        "不填"
      ],
      "answer": "a",
      "wrongFeedback": "三餐前有形容词修饰，表示“一顿……”时可以用 a。",
      "explanation": "a big breakfast 表示“一顿丰盛的早餐”。",
      "bankItemId": "grammar-2026-07-17-articles::AR14",
      "sourceQuestionId": "AR14",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:05e53f645cf80feb4a5fe339cd645f9ce094e41f52857da7b82c48eaab8935b2",
      "variantGroupId": "articles::context"
    },
    {
      "id": "grammar-2026-07-17-articles::AR15",
      "category": "correction",
      "categoryLabel": "句子纠错｜a / an",
      "type": "single",
      "source": "She is an university student.",
      "prompt": "选择正确改法。",
      "options": [
        "She is a university student.",
        "She is the university student.",
        "She is university student.",
        "She is an university student."
      ],
      "answer": "She is a university student.",
      "wrongFeedback": "university 的读音以辅音音素 /j/ 开头。",
      "explanation": "应该使用 a university student。",
      "bankItemId": "grammar-2026-07-17-articles::AR15",
      "sourceQuestionId": "AR15",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:353391d861d0daf2fb034f736b3c1daaae6c68fc6b92c8b5a7c91755543dc4ae",
      "variantGroupId": "articles::correction"
    },
    {
      "id": "grammar-2026-07-17-articles::AR16",
      "category": "correction",
      "categoryLabel": "句子纠错｜三餐",
      "type": "single",
      "source": "I have the breakfast at seven every day.",
      "prompt": "选择正确改法。",
      "options": [
        "I have breakfast at seven every day.",
        "I have a breakfast at seven every day.",
        "I have an breakfast at seven every day.",
        "I have the breakfasts at seven every day."
      ],
      "answer": "I have breakfast at seven every day.",
      "wrongFeedback": "表示每天吃早饭时，breakfast 前通常不加冠词。",
      "explanation": "日常三餐使用零冠词：have breakfast。",
      "bankItemId": "grammar-2026-07-17-articles::AR16",
      "sourceQuestionId": "AR16",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:a063972964615073614bc25e2d478c9307df1bdf3789f88b96e190e4821075d3",
      "variantGroupId": "articles::correction"
    },
    {
      "id": "grammar-2026-07-17-articles::AR17",
      "category": "correction",
      "categoryLabel": "句子纠错｜乐器",
      "type": "single",
      "source": "He can play piano very well.",
      "prompt": "选择正确改法。",
      "options": [
        "He can play the piano very well.",
        "He can play a piano very well.",
        "He can play an piano very well.",
        "He can play the pianos very well."
      ],
      "answer": "He can play the piano very well.",
      "wrongFeedback": "表示演奏西洋乐器时，乐器名称前通常加 the。",
      "explanation": "固定搭配：play the piano。",
      "bankItemId": "grammar-2026-07-17-articles::AR17",
      "sourceQuestionId": "AR17",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:52bcd52b6cb523b13ffbaf4aac37146b0e350902eef3f56bd5ac711ab13c0650",
      "variantGroupId": "articles::correction"
    },
    {
      "id": "grammar-2026-07-17-articles::AR18",
      "category": "correction",
      "categoryLabel": "句子纠错｜独一无二",
      "type": "single",
      "source": "Moon goes around the earth.",
      "prompt": "选择正确改法。",
      "options": [
        "The moon goes around the earth.",
        "A moon goes around the earth.",
        "An moon goes around the earth.",
        "The moon goes around an earth."
      ],
      "answer": "The moon goes around the earth.",
      "wrongFeedback": "moon 和 earth 在这里都指独一无二的天体。",
      "explanation": "使用 the moon 和 the earth。",
      "bankItemId": "grammar-2026-07-17-articles::AR18",
      "sourceQuestionId": "AR18",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:f185c4c9bcc7a3d1d807ab797f4d87fc4462abcb8fa8c58629126d512a2001b1",
      "variantGroupId": "articles::correction"
    },
    {
      "id": "grammar-2026-07-17-articles::AR19",
      "category": "multi",
      "categoryLabel": "多选｜找出正确句子",
      "type": "multi",
      "prompt": "选择所有冠词使用正确的句子。",
      "options": [
        "I have lunch at school.",
        "She plays the guitar.",
        "We study the maths on Monday.",
        "He is an honest boy.",
        "They play the volleyball after class.",
        "This is a useful book."
      ],
      "answer": [
        "I have lunch at school.",
        "She plays the guitar.",
        "He is an honest boy.",
        "This is a useful book."
      ],
      "wrongFeedback": "注意三餐、科目和球类通常用零冠词；honest 的 h 不发音。",
      "explanation": "lunch、maths、volleyball 的冠词规则不同；honest 用 an，useful 用 a。",
      "bankItemId": "grammar-2026-07-17-articles::AR19",
      "sourceQuestionId": "AR19",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:c399526df24263422f87aff69a8e0c2243fa1ebba718b7bc0dfc4e60a7ed2168",
      "variantGroupId": "articles::multi"
    },
    {
      "id": "grammar-2026-07-17-articles::AR20",
      "category": "multi",
      "categoryLabel": "多选｜the 的使用",
      "type": "multi",
      "prompt": "选择所有必须使用 the 的搭配。",
      "options": [
        "___ sun",
        "___ first page",
        "play ___ piano",
        "have ___ dinner",
        "study ___ science",
        "play ___ tennis"
      ],
      "answer": [
        "___ sun",
        "___ first page",
        "play ___ piano"
      ],
      "wrongFeedback": "独一无二的事物、序数词和西洋乐器前常用 the。",
      "explanation": "the sun、the first page、play the piano；三餐、科目和球类通常用零冠词。",
      "bankItemId": "grammar-2026-07-17-articles::AR20",
      "sourceQuestionId": "AR20",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:158184694e7b15b7f47233ce74e6814f488ae8c0dc4ed24655f81abdca2160be",
      "variantGroupId": "articles::multi"
    },
    {
      "id": "grammar-2026-07-17-articles::AR21",
      "category": "order",
      "categoryLabel": "句子排序｜再次提到",
      "type": "order",
      "source": "我看到一只猫。那只猫在树下。",
      "prompt": "按正确语序点击词块，组成第二句。",
      "options": [
        "The cat",
        "under",
        "is",
        "the tree",
        "."
      ],
      "answer": [
        "The cat",
        "is",
        "under",
        "the tree",
        "."
      ],
      "answerDisplay": "The cat is under the tree.",
      "wrongFeedback": "已经提到过的猫和双方明确的树都使用 the。",
      "explanation": "再次提到同一只猫时用 The cat。",
      "bankItemId": "grammar-2026-07-17-articles::AR21",
      "sourceQuestionId": "AR21",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:70927c094bfc368e4c13d767a79cee3eb0b3b4692b884157a6b3bab2ee9f0965",
      "variantGroupId": "articles::order"
    },
    {
      "id": "grammar-2026-07-17-articles::AR22",
      "category": "order",
      "categoryLabel": "句子排序｜球类与乐器",
      "type": "order",
      "source": "她弹钢琴，但她弟弟踢足球。",
      "prompt": "按正确语序点击词块。",
      "options": [
        "but",
        "plays",
        "football",
        "the piano",
        "her brother",
        "She",
        "plays",
        ",",
        "."
      ],
      "answer": [
        "She",
        "plays",
        "the piano",
        ",",
        "but",
        "her brother",
        "plays",
        "football",
        "."
      ],
      "answerDisplay": "She plays the piano, but her brother plays football.",
      "wrongFeedback": "乐器前用 the；球类前不用冠词。",
      "explanation": "play the piano；play football。",
      "bankItemId": "grammar-2026-07-17-articles::AR22",
      "sourceQuestionId": "AR22",
      "sourceChallengeId": "grammar-2026-07-17-articles",
      "sourceChallengeDate": "2026-07-17",
      "sourceChallengeTitle": "冠词｜a / an / the / 零冠词",
      "sourceLessonKey": "articles",
      "sourceLessonKpIds": [
        "articles"
      ],
      "kpIds": [
        "articles"
      ],
      "primaryKpId": "articles",
      "weaknessIds": [],
      "primaryWeaknessId": "",
      "diagnosticTargets": [],
      "contentHash": "sha256:84a43d6566ee3ba8541851ac09a65e8f9b113c25d7dd4cf43db8e47dc9d36328",
      "variantGroupId": "articles::order"
    }
  ]
});
});
