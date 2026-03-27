import { explainTopic } from './backendApi'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced']
const MAX_DOCUMENT_TEXT_LENGTH = 20000

function createFallbackAnalyzeData({ topic, fileName }) {
  const normalizedTopic = topic || 'General Science'

  return {
    topic: normalizedTopic,
    sourceFileName: fileName || '',
    notes: {
      title: `${normalizedTopic} - AI Notes`,
      overview: `${normalizedTopic} has been analyzed to create concise study notes and actionable insights for practice.`,
      keyPoints: [
        'Core concepts were extracted from the provided topic/module.',
        'Key terms and definitions were identified for rapid revision.',
        'Common mistakes and exam-focused areas were highlighted.',
      ],
      additionalNotes: [
        'Review key terms before attempting the quiz.',
        'Use incorrect answers as revision anchors.',
      ],
      insights: {
        strengths: ['Clear concept identification', 'Good topic coverage'],
        weaknesses: ['Needs more advanced-level practice'],
        recommendations: ['Attempt all 3 levels: Beginner, Intermediate, Advanced'],
      },
    },
    quiz: {
      beginner: [
        {
          id: 1,
          difficulty: 'Beginner',
          question: `What best describes ${normalizedTopic}?`,
          correctOption: 'A',
          options: [
            { id: 'A', label: 'A foundational concept set', hint: 'Start with basics' },
            { id: 'B', label: 'Only an advanced topic', hint: 'Too restrictive' },
            { id: 'C', label: 'Not relevant for exams', hint: 'Usually not true' },
            { id: 'D', label: 'A purely historical term', hint: 'Context-dependent' },
          ],
        },
      ],
      intermediate: [
        {
          id: 2,
          difficulty: 'Intermediate',
          question: `Which study strategy is most effective for ${normalizedTopic}?`,
          correctOption: 'B',
          options: [
            { id: 'A', label: 'Memorize without practice', hint: 'Low retention' },
            { id: 'B', label: 'Concept review plus mixed practice', hint: 'Balanced approach' },
            { id: 'C', label: 'Skip revision entirely', hint: 'High risk' },
            { id: 'D', label: 'Only read summaries', hint: 'Missing depth' },
          ],
        },
      ],
      advanced: [
        {
          id: 3,
          difficulty: 'Advanced',
          question: `How should you improve performance on advanced ${normalizedTopic} questions?`,
          correctOption: 'C',
          options: [
            { id: 'A', label: 'Avoid timed practice', hint: 'Timing matters' },
            { id: 'B', label: 'Ignore weak areas', hint: 'Limits improvement' },
            { id: 'C', label: 'Analyze mistakes and retry targeted sets', hint: 'Best improvement loop' },
            { id: 'D', label: 'Use only beginner quizzes', hint: 'Insufficient challenge' },
          ],
        },
      ],
      allQuestions: [],
    },
  }
}

function sanitizeExplanationText(rawText = '') {
  const text = String(rawText || '').replace(/\r\n/g, '\n').trim()
  if (!text) {
    return ''
  }

  const cleanInlineFormatting = (line) => String(line)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/, '')
    .trim()

  const isTemplateHeadingLine = (line) => {
    const normalized = line
      .toLowerCase()
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^[-*\u2022]\s*/, '')
      .trim()

    return (
      normalized.startsWith('category:')
      || normalized.startsWith('short overview')
      || normalized.startsWith('key learning points')
      || normalized.startsWith('extra notes')
      || normalized.startsWith('revision notes')
      || normalized.startsWith('the knowledge pyramid')
      || normalized === 'coding'
      || normalized === 'non-coding'
    )
  }

  const lines = text
    .split('\n')
    .map((line) => cleanInlineFormatting(line))
    .filter(Boolean)
    .filter((line) => !/^do you have any specific questions/i.test(line))
    .filter((line) => !/^would you like me to/i.test(line))
    .filter((line) => !/^let me know if you want/i.test(line))
    .filter((line) => !/^since this topic is not coding/i.test(line))
    .filter((line) => !/^if this topic is coding/i.test(line))
    .filter((line) => !/^if the topic is coding/i.test(line))
    .filter((line) => !/^there is no code example to provide/i.test(line))
    .filter((line) => !isTemplateHeadingLine(line))

  return lines.join('\n')
}

function isStudyAdviceLine(line = '') {
  const normalized = String(line).toLowerCase().trim()
  return (
    normalized.includes('read the explanation once')
    || normalized.includes('attempt all quiz sections')
    || normalized.includes('review wrong answers')
    || normalized.includes('use final insights')
    || normalized.startsWith('focus on definitions')
    || normalized.startsWith('revise')
    || normalized.startsWith('practice')
  )
}

function sentencePointsFromProse(proseLines = [], limit = 4) {
  const sentences = proseLines
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30)
    .filter((sentence) => !isStudyAdviceLine(sentence))

  const deduped = []
  for (const sentence of sentences) {
    if (!deduped.some((item) => item.toLowerCase() === sentence.toLowerCase())) {
      deduped.push(sentence)
    }
    if (deduped.length >= limit) {
      break
    }
  }

  return deduped
}

function parseExplanationToNotes(explanation = '') {
  const cleaned = sanitizeExplanationText(explanation)
  if (!cleaned) {
    return {
      overview: '',
      keyPoints: [],
      additionalNotes: [],
    }
  }

  const rawLines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const bullets = []
  const prose = []

  const normalizePointLine = (line) => line
    .replace(/^[-*\u2022]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim()

  const isTemplateHeadingPoint = (line) => {
    const normalized = normalizePointLine(line).toLowerCase()
    return (
      normalized.startsWith('category:')
      || normalized.startsWith('short overview')
      || normalized.startsWith('key learning points')
      || normalized.startsWith('extra notes')
      || normalized.startsWith('revision notes')
      || normalized.startsWith('the knowledge pyramid')
    )
  }

  for (const line of rawLines) {
    if (/^[-*\u2022]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const normalized = normalizePointLine(line)
      if (normalized && !isTemplateHeadingPoint(normalized)) {
        bullets.push(normalized)
      }
    } else {
      if (!isTemplateHeadingPoint(line)) {
        prose.push(line)
      }
    }
  }

  const overview = prose.slice(0, 2).join(' ')
  const cleanedBullets = bullets.filter((point) => !isStudyAdviceLine(point))
  const derivedPoints = sentencePointsFromProse(prose)
  const keyPoints = cleanedBullets.length > 0 ? cleanedBullets.slice(0, 6) : derivedPoints
  const additionalNotes = [...prose.slice(2), ...cleanedBullets.slice(6)]
    .filter((line) => !isStudyAdviceLine(line))
    .slice(0, 5)

  return {
    overview: overview || cleaned,
    keyPoints,
    additionalNotes,
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read uploaded document.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsText(file)
  })
}

async function readPdfFile(file) {
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const pageTexts = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => (typeof item?.str === 'string' ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .trim()
      if (text) {
        pageTexts.push(text)
      }
    }

    return pageTexts.join('\n\n')
  } catch {
    throw new Error('Could not read text from this PDF. Try another PDF or upload a text-based file.')
  }
}

function isPdfFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  return name.endsWith('.pdf') || type === 'application/pdf'
}

function supportsDocumentExtraction(file) {
  const name = String(file?.name || '').toLowerCase()
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.log']
  const isTextLike = textExtensions.some((ext) => name.endsWith(ext)) || String(file?.type || '').startsWith('text/')
  return isTextLike || isPdfFile(file)
}

function clampDocumentText(rawText = '') {
  const normalized = String(rawText || '').trim()
  if (normalized.length <= MAX_DOCUMENT_TEXT_LENGTH) {
    return normalized
  }

  const sliced = normalized.slice(0, MAX_DOCUMENT_TEXT_LENGTH)
  const lastBoundary = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('\n'))
  if (lastBoundary > MAX_DOCUMENT_TEXT_LENGTH * 0.6) {
    return sliced.slice(0, lastBoundary + 1).trim()
  }
  return sliced.trim()
}

function normalizeOption(option, index) {
  const id = String.fromCharCode(65 + index)

  if (typeof option === 'string') {
    return { id, label: option, hint: '' }
  }

  return {
    id: option?.id || id,
    label: option?.label || option?.text || `Option ${id}`,
    hint: option?.hint || '',
  }
}

function normalizeQuestion(question, index, difficulty) {
  const rawOptions = Array.isArray(question?.options) ? question.options : []
  const options = rawOptions.slice(0, 4).map((option, optionIndex) => normalizeOption(option, optionIndex))
  const safeOptions = options.length > 0 ? options : [
    { id: 'A', label: 'Option A', hint: '' },
    { id: 'B', label: 'Option B', hint: '' },
    { id: 'C', label: 'Option C', hint: '' },
    { id: 'D', label: 'Option D', hint: '' },
  ]

  const fallbackCorrect = safeOptions[0].id
  const incomingCorrect = question?.correctOption || question?.answer || question?.correct
  const normalizedCorrect = safeOptions.some((opt) => opt.id === incomingCorrect) ? incomingCorrect : fallbackCorrect

  return {
    id: question?.id || index + 1,
    difficulty,
    question: question?.question || question?.prompt || `Question ${index + 1}`,
    correctOption: normalizedCorrect,
    options: safeOptions,
  }
}

function normalizeDifficultyQuestions(questions, difficulty) {
  if (!Array.isArray(questions)) {
    return []
  }

  return questions.map((question, index) => normalizeQuestion(question, index, difficulty))
}

function buildQuestionPlan({ topic = '', fileSizeBytes = 0 }) {
  const topicWordCount = topic.trim() ? topic.trim().split(/\s+/).length : 0
  const fileWeight = Math.floor(fileSizeBytes / 9000)
  const signal = topicWordCount + fileWeight

  let totalQuestions = 6
  if (signal >= 80) {
    totalQuestions = 15
  } else if (signal >= 45) {
    totalQuestions = 12
  } else if (signal >= 20) {
    totalQuestions = 9
  }

  const beginner = Math.max(1, Math.round(totalQuestions * 0.33))
  const intermediate = Math.max(1, Math.round(totalQuestions * 0.34))
  const advanced = Math.max(1, totalQuestions - beginner - intermediate)

  return {
    totalQuestions,
    beginner,
    intermediate,
    advanced,
  }
}

function createDefaultQuestion(topic, difficulty, id, sequence = 1) {
  const normalizedTopic = topic || 'General Science'

  if (difficulty === 'Beginner') {
    return {
      id,
      difficulty,
      question: `Beginner ${sequence}: Which statement best introduces ${normalizedTopic}?`,
      correctOption: 'A',
      options: [
        { id: 'A', label: 'It starts from core foundational concepts', hint: 'Begin with basics' },
        { id: 'B', label: 'Only experts can understand it', hint: 'Not always true' },
        { id: 'C', label: 'It has no practical use', hint: 'Incorrect in most cases' },
        { id: 'D', label: 'It should be skipped in revision', hint: 'Not recommended' },
      ],
    }
  }

  if (difficulty === 'Advanced') {
    return {
      id,
      difficulty,
      question: `Advanced ${sequence}: What is the best way to improve advanced ${normalizedTopic} performance?`,
      correctOption: 'C',
      options: [
        { id: 'A', label: 'Avoid timed questions', hint: 'Timing is important' },
        { id: 'B', label: 'Ignore analysis of mistakes', hint: 'Weak strategy' },
        { id: 'C', label: 'Review mistakes and practice targeted advanced sets', hint: 'Best approach' },
        { id: 'D', label: 'Practice only beginner questions', hint: 'Insufficient challenge' },
      ],
    }
  }

  return {
    id,
    difficulty,
    question: `Intermediate ${sequence}: Which method is effective for learning ${normalizedTopic} at intermediate level?`,
    correctOption: 'B',
    options: [
      { id: 'A', label: 'Read once without revision', hint: 'Low retention' },
      { id: 'B', label: 'Mix concept review with practice questions', hint: 'Balanced learning' },
      { id: 'C', label: 'Skip difficult subtopics', hint: 'Leaves gaps' },
      { id: 'D', label: 'Memorize only definitions', hint: 'Lacks depth' },
    ],
  }
}

function fitDifficultyQuestions(questions, requiredCount, topic, difficulty) {
  const trimmed = questions.slice(0, requiredCount)

  if (trimmed.length >= requiredCount) {
    return trimmed.map((question, index) => ({ ...question, id: index + 1 }))
  }

  const filled = [...trimmed]
  while (filled.length < requiredCount) {
    const nextSequence = filled.length + 1
    filled.push(createDefaultQuestion(topic, difficulty, nextSequence, nextSequence))
  }

  return filled.map((question, index) => ({ ...question, id: index + 1 }))
}

function buildCompulsoryThreeLevelQuiz(quizByDifficulty, topic, questionPlan) {
  return {
    beginner: fitDifficultyQuestions(quizByDifficulty.beginner, questionPlan.beginner, topic, 'Beginner'),
    intermediate: fitDifficultyQuestions(quizByDifficulty.intermediate, questionPlan.intermediate, topic, 'Intermediate'),
    advanced: fitDifficultyQuestions(quizByDifficulty.advanced, questionPlan.advanced, topic, 'Advanced'),
  }
}

function flattenQuiz(quizByDifficulty) {
  let runningId = 1
  const mixed = []

  difficultyOrder.forEach((difficulty) => {
    const key = difficulty.toLowerCase()
    const group = Array.isArray(quizByDifficulty[key]) ? quizByDifficulty[key] : []

    group.forEach((question) => {
      mixed.push({ ...question, id: runningId })
      runningId += 1
    })
  })

  return mixed
}

function normalizeAnalyzeResponse(payload, context) {
  const fallback = createFallbackAnalyzeData(context)
  const resolvedTopic = payload?.topic || context.topic || fallback.topic
  const questionPlan = buildQuestionPlan({ topic: resolvedTopic, fileSizeBytes: context.fileSizeBytes || 0 })
  const notes = payload?.notes || {}
  const insights = notes?.insights || payload?.insights || {}

  const rawQuiz = {
    beginner: normalizeDifficultyQuestions(payload?.quiz?.beginner, 'Beginner'),
    intermediate: normalizeDifficultyQuestions(payload?.quiz?.intermediate, 'Intermediate'),
    advanced: normalizeDifficultyQuestions(payload?.quiz?.advanced, 'Advanced'),
  }

  const completedQuiz = buildCompulsoryThreeLevelQuiz(rawQuiz, resolvedTopic, questionPlan)

  const quiz = {
    beginner: completedQuiz.beginner,
    intermediate: completedQuiz.intermediate,
    advanced: completedQuiz.advanced,
    allQuestions: flattenQuiz(completedQuiz),
  }

  return {
    topic: resolvedTopic,
    sourceFileName: payload?.sourceFileName || context.fileName || fallback.sourceFileName,
    notes: {
      title: notes?.title || fallback.notes.title,
      overview: notes?.overview || fallback.notes.overview,
      keyPoints: Array.isArray(notes?.keyPoints) && notes.keyPoints.length > 0 ? notes.keyPoints : fallback.notes.keyPoints,
      additionalNotes: Array.isArray(notes?.additionalNotes) && notes.additionalNotes.length > 0 ? notes.additionalNotes : fallback.notes.additionalNotes,
      insights: {
        strengths: Array.isArray(insights?.strengths) ? insights.strengths : fallback.notes.insights.strengths,
        weaknesses: Array.isArray(insights?.weaknesses) ? insights.weaknesses : fallback.notes.insights.weaknesses,
        recommendations: Array.isArray(insights?.recommendations) ? insights.recommendations : fallback.notes.insights.recommendations,
      },
    },
    quiz,
  }
}

export async function analyzeStudyContent({ topic = '', file = null, token = '' }) {
  const trimmedTopic = topic.trim()
  if (!trimmedTopic && !file) {
    throw new Error('Please enter a topic or upload a file before analyzing.')
  }

  let inputType = 'topic'
  let requestTopic = trimmedTopic || file?.name || 'General Science'
  let documentText = ''

  if (file) {
    if (!supportsDocumentExtraction(file)) {
      throw new Error('For document analysis, upload a supported file like .pdf, .txt, or .md so it can be processed by RAG.')
    }
    documentText = clampDocumentText(isPdfFile(file) ? await readPdfFile(file) : await readTextFile(file))
    if (!documentText) {
      throw new Error('Uploaded document is empty. Please upload a file with readable text.')
    }
    inputType = 'document'
  }

  const explanationPayload = await explainTopic({
    token,
    inputType,
    topic: requestTopic,
    documentText,
    question:
      'Provide a concise explanation with clear sections and practical examples. Do not ask follow-up questions.',
  })

  const parsedNotes = parseExplanationToNotes(explanationPayload?.explanation || '')

  return normalizeAnalyzeResponse(
    {
      topic: requestTopic,
      notes: {
        title: `${requestTopic || 'Study Topic'} - AI Notes`,
        overview: parsedNotes.overview,
        keyPoints:
          parsedNotes.keyPoints.length > 0
            ? parsedNotes.keyPoints
            : createFallbackAnalyzeData({ topic: requestTopic }).notes.keyPoints,
        additionalNotes:
          parsedNotes.additionalNotes.length > 0
            ? parsedNotes.additionalNotes
            : createFallbackAnalyzeData({ topic: requestTopic }).notes.additionalNotes,
      },
    },
    {
      topic: requestTopic,
      fileName: file?.name || '',
      fileSizeBytes: file?.size || 0,
    },
  )
}
