import { useEffect, useState } from 'react';
import { getSubject, subjects } from './data/index.js';

const STORAGE_KEY = 'simple-exam-attempt-v1';
const EXAM_LENGTH_MS = 60 * 60 * 1000;
const LETTERS = ['A', 'B', 'C', 'D'];

function readSavedAttempt() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && getSubject(saved.subjectId) && ['ready', 'active', 'completed'].includes(saved.status)) {
      return saved;
    }
  } catch {
    // Ignore incomplete or invalid local data.
  }
  return null;
}

function completeAttempt(attempt) {
  if (!attempt || attempt.status !== 'active') return attempt;
  const subject = getSubject(attempt.subjectId);
  return {
    ...attempt,
    status: 'completed',
    submittedAt: Date.now(),
    score: subject.multipleChoice.reduce(
      (total, question, index) => total + (attempt.answers[index] === question.correctAnswer ? 1 : 0),
      0,
    ),
    descriptiveAnswered: attempt.writtenAnswers.filter((answer) => answer.trim().length > 0).length,
  };
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function App() {
  const [attempt, setAttempt] = useState(readSavedAttempt);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (attempt) localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
    else localStorage.removeItem(STORAGE_KEY);
  }, [attempt]);

  useEffect(() => {
    if (attempt?.status !== 'active') return undefined;
    const tick = () => {
      setNow(Date.now());
      setAttempt((current) => {
        if (current?.status === 'active' && Date.now() >= current.startedAt + EXAM_LENGTH_MS) {
          return completeAttempt(current);
        }
        return current;
      });
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt?.status, attempt?.startedAt]);

  const subject = attempt ? getSubject(attempt.subjectId) : null;

  function chooseSubject(subjectId) {
    setAttempt({ subjectId, status: 'ready' });
  }

  function startExam() {
    if (!subject) return;
    setNow(Date.now());
    setAttempt({
      subjectId: subject.id,
      status: 'active',
      startedAt: Date.now(),
      currentIndex: 0,
      answers: Array(subject.multipleChoice.length).fill(null),
      writtenAnswers: Array(subject.descriptive.length).fill(''),
    });
  }

  function submitExam() {
    if (window.confirm('Are you sure you want to submit?')) {
      setAttempt((current) => completeAttempt(current));
    }
  }

  function updateAnswer(letter) {
    setAttempt((current) => {
      const answers = [...current.answers];
      answers[current.currentIndex] = letter;
      return { ...current, answers };
    });
  }

  function updateWrittenAnswer(value) {
    setAttempt((current) => {
      const writtenAnswers = [...current.writtenAnswers];
      writtenAnswers[current.currentIndex - subject.multipleChoice.length] = value;
      return { ...current, writtenAnswers };
    });
  }

  function goToQuestion(index) {
    setAttempt((current) => ({ ...current, currentIndex: index }));
  }

  if (!attempt) {
    return (
      <main className="page home-page">
        <header className="page-heading">
          <p className="eyebrow">Simple Exams</p>
          <h1>Choose a Subject</h1>
          <p>Select a subject to begin a one-hour practice exam.</p>
        </header>
        <div className="subject-grid">
          {subjects.map((item) => (
            <button className="subject-card" key={item.id} onClick={() => chooseSubject(item.id)}>
              <span className="subject-title">{item.title}</span>
              <span className="subject-detail">30 multiple choice · 3 written</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  if (attempt.status === 'ready') {
    return (
      <main className="page narrow-page">
        <button className="text-button back-button" onClick={() => setAttempt(null)}>← All subjects</button>
        <section className="panel intro-panel">
          <p className="eyebrow">Practice exam</p>
          <h1>{subject.title}</h1>
          <p>Answer 30 multiple-choice questions and 3 descriptive questions. You have one hour once you start.</p>
          <div className="intro-facts">
            <span><strong>33</strong> questions</span>
            <span><strong>60</strong> minutes</span>
          </div>
          <button className="button primary-button" onClick={startExam}>Start Exam</button>
        </section>
      </main>
    );
  }

  if (attempt.status === 'completed') {
    return (
      <main className="page narrow-page result-page">
        <section className="panel result-panel">
          <div className="completion-mark" aria-hidden="true">✓</div>
          <p className="eyebrow">{subject.title}</p>
          <h1>Exam Completed</h1>
          <p>Your answers have been submitted.</p>
          <div className="result-list">
            <div><span>Multiple Choice Score</span><strong>{attempt.score} / 30</strong></div>
            <div><span>Descriptive Questions Answered</span><strong>{attempt.descriptiveAnswered} / 3</strong></div>
          </div>
          <div className="result-actions">
            <button className="button primary-button" onClick={() => setAttempt(null)}>Back to Subjects</button>
            <button className="button secondary-button" onClick={() => chooseSubject(subject.id)}>Start New Exam</button>
          </div>
        </section>
      </main>
    );
  }

  const multipleChoiceCount = subject.multipleChoice.length;
  const totalQuestions = multipleChoiceCount + subject.descriptive.length;
  const index = Math.min(Math.max(attempt.currentIndex ?? 0, 0), totalQuestions - 1);
  const isWritten = index >= multipleChoiceCount;
  const question = isWritten
    ? subject.descriptive[index - multipleChoiceCount]
    : subject.multipleChoice[index];
  const answeredCount = attempt.answers.filter(Boolean).length
    + attempt.writtenAnswers.filter((answer) => answer.trim().length > 0).length;
  const remaining = Math.max(0, attempt.startedAt + EXAM_LENGTH_MS - now);

  return (
    <main className="page exam-page">
      <header className="exam-header">
        <div>
          <p className="eyebrow">{subject.title} exam</p>
          <h1>Question {index + 1} of {totalQuestions}</h1>
        </div>
        <div className="timer" role="timer" aria-label={`Time remaining ${formatTime(remaining)}`}>
          <span>Time remaining</span>
          <strong>{formatTime(remaining)}</strong>
        </div>
      </header>

      <div className="progress-summary">
        <span>{answeredCount} of {totalQuestions} answered</span>
        <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={answeredCount} aria-valuemin="0" aria-valuemax={totalQuestions} aria-label="Questions answered">
        <div className="progress-fill" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
      </div>

      <div className="exam-layout">
        <section className="panel question-panel" aria-labelledby="question-title">
          <p className="question-type">{isWritten ? 'Descriptive question' : 'Multiple choice'}</p>
          <h2 id="question-title">{question.text}</h2>

          {isWritten ? (
            <label className="written-answer">
              <span>Your answer</span>
              <textarea
                value={attempt.writtenAnswers[index - multipleChoiceCount]}
                onChange={(event) => updateWrittenAnswer(event.target.value)}
                placeholder="Type your answer here..."
                rows="9"
              />
            </label>
          ) : (
            <div className="options" role="radiogroup" aria-label="Answer choices">
              {question.options.map((option, optionIndex) => {
                const letter = LETTERS[optionIndex];
                const selected = attempt.answers[index] === letter;
                return (
                  <label className={`option ${selected ? 'selected' : ''}`} key={letter}>
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={letter}
                      checked={selected}
                      onChange={() => updateAnswer(letter)}
                    />
                    <span className="option-letter">{letter}</span>
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="question-actions">
            <button className="button secondary-button" disabled={index === 0} onClick={() => goToQuestion(index - 1)}>Previous</button>
            {index < totalQuestions - 1 && (
              <button className="button primary-button" onClick={() => goToQuestion(index + 1)}>Next</button>
            )}
          </div>
        </section>

        <aside className="panel navigator-panel" aria-label="Question navigation">
          <div className="navigator-heading">
            <h2>Questions</h2>
            <span>{answeredCount} / {totalQuestions}</span>
          </div>
          <div className="question-grid">
            {Array.from({ length: totalQuestions }, (_, questionIndex) => {
              const answered = questionIndex < multipleChoiceCount
                ? Boolean(attempt.answers[questionIndex])
                : attempt.writtenAnswers[questionIndex - multipleChoiceCount].trim().length > 0;
              return (
                <button
                  key={questionIndex}
                  className={`question-number ${questionIndex === index ? 'current' : ''} ${answered ? 'answered' : ''}`}
                  aria-label={`Question ${questionIndex + 1}${answered ? ', answered' : ''}`}
                  aria-current={questionIndex === index ? 'step' : undefined}
                  onClick={() => goToQuestion(questionIndex)}
                >
                  {questionIndex + 1}
                </button>
              );
            })}
          </div>
          <div className="navigator-legend"><span className="legend-dot" /> Answered</div>
          <button className="button submit-button" onClick={submitExam}>Submit Exam</button>
        </aside>
      </div>
    </main>
  );
}
