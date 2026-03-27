import { useMemo, useState } from 'react'
import SharedSidebar from '../components/SharedSidebar'
import './NotesPage.css'

const defaultGeneratedNotes = {
  title: 'Photosynthesis Explained',
  overview:
    'Photosynthesis is the process by which plants use sunlight to synthesize nutrients from carbon dioxide and water. This process is essential for producing oxygen and energy in the form of glucose.',
  keyPoints: [
    'Light Reactions: Occur in thylakoid membranes where light energy is converted into ATP and NADPH.',
    'Calvin Cycle: Takes place in the stroma, where CO2 is fixed into glucose.',
  ],
  additionalNotes: [
    'Chlorophyll in the chloroplasts absorbs sunlight.',
    'Oxygen is released as a byproduct.',
    'Photosynthesis is crucial for life on Earth.',
  ],
}

function NotesPage({ onNavigate, onGenerateQuiz = () => {}, quizUnlocked = false, analysisData = null }) {
  const [showPreview, setShowPreview] = useState(false)
  const hasGeneratedOutput = Boolean(analysisData)

  const generatedNotes = useMemo(() => {
    if (!analysisData?.notes) {
      return defaultGeneratedNotes
    }

    return {
      title: analysisData.notes.title || defaultGeneratedNotes.title,
      overview: analysisData.notes.overview || defaultGeneratedNotes.overview,
      keyPoints: Array.isArray(analysisData.notes.keyPoints) && analysisData.notes.keyPoints.length > 0
        ? analysisData.notes.keyPoints
        : defaultGeneratedNotes.keyPoints,
      additionalNotes:
        Array.isArray(analysisData.notes.additionalNotes) && analysisData.notes.additionalNotes.length > 0
          ? analysisData.notes.additionalNotes
          : defaultGeneratedNotes.additionalNotes,
    }
  }, [analysisData])

  const generatedTopicTitle = analysisData?.topic || generatedNotes.title
  const attachedFileName = analysisData?.sourceFileName || 'No file uploaded'

  return (
    <div className="notes-page">
      <SharedSidebar active="notes" onNavigate={onNavigate} />

      <main className="notes-main">
        <h1 className="notes-title">📋 Notes &amp; Insights</h1>

        <div className="notes-grid notes-grid-single">
          <section className="notes-card">
            <h2 className="notes-card-header">📗 Study Notes ✏️</h2>
            <hr className="notes-divider" />

            <h3 className="notes-section-title">{generatedTopicTitle}</h3>

            <hr className="notes-divider" />
            <p className="notes-label">Overview:</p>
            <p className="notes-paragraph">
              {generatedNotes.overview}
            </p>

            <hr className="notes-divider" />
            <p className="notes-label">Key Learning Points:</p>
            <ul className="notes-list">
              {generatedNotes.keyPoints.map((point, index) => (
                <li key={`${point}-${index}`}>
                  <span className="notes-inline-strong">{index + 1}.</span> {point}
                </li>
              ))}
            </ul>

            <hr className="notes-divider" />
            <p className="notes-label">Additional Notes:</p>
            <ul className="notes-list">
              {generatedNotes.additionalNotes.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>

            <hr className="notes-divider" />
            <div className="notes-file-row">
              <span className="notes-file-label">Analyzed Module:</span>
              <a href="#" className="notes-file-link">
                {attachedFileName}
              </a>
            </div>

            <div className="notes-attachment">
              <div className="notes-thumbnail">Thumbnail</div>
              <button type="button" className="notes-view-btn" onClick={() => setShowPreview(true)}>
                View
              </button>
            </div>
          </section>
        </div>

        <section className="notes-generate-wrap">
          <button
            type="button"
            className="notes-generate-btn"
            onClick={onGenerateQuiz}
            disabled={!hasGeneratedOutput}
          >
            Open Generated Quiz
          </button>
          <p className="notes-generate-note">
            {quizUnlocked && hasGeneratedOutput
              ? 'LLM generated notes and quiz levels. You can now start the quiz.'
              : 'Run Analyze from Study page to generate notes and the quiz.'}
          </p>
        </section>

        {showPreview && (
          <div className="notes-modal-overlay" role="dialog" aria-modal="true" aria-label="Document preview">
            <div className="notes-modal">
              <div className="notes-modal-head">
                <h3>photosynthesis_diagram.jpg</h3>
                <button type="button" className="notes-modal-close" onClick={() => setShowPreview(false)}>
                  ✕
                </button>
              </div>
              <div className="notes-modal-body">
                <div className="notes-preview-image" aria-label="Preview placeholder">
                  Image Preview
                </div>
                <p>
                  Preview mode is active. You can replace this placeholder with an actual uploaded image source later.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default NotesPage
