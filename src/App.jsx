import React, { useEffect, useState } from 'react';
import { getSubject, subjects } from './data/index.js';

const STORAGE_KEY = 'simple-exam-attempt-v2';
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
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);

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
      answers: Array(subject.multipleChoice.length).fill(null),
      writtenAnswers: Array(subject.descriptive.length).fill(''),
    });
  }

  function submitExam() {
    setShowSubmitConfirmation(true);
  }

  function confirmSubmit() {
    setAttempt((current) => completeAttempt(current));
    setShowSubmitConfirmation(false);
  }

  function updateAnswer(index, letter) {
    setAttempt((current) => {
      const answers = [...current.answers];
      answers[index] = letter;
      return { ...current, answers };
    });
  }

  function updateWrittenAnswer(index, value) {
    setAttempt((current) => {
      const writtenAnswers = [...current.writtenAnswers];
      writtenAnswers[index] = value;
      return { ...current, writtenAnswers };
    });
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
  const answeredCount = attempt.answers.filter(Boolean).length
    + attempt.writtenAnswers.filter((answer) => answer.trim().length > 0).length;
  const remaining = Math.max(0, attempt.startedAt + EXAM_LENGTH_MS - now);

  return (
    <main className="page exam-page">
      <header className="exam-header">
        <div>
          <p className="eyebrow">{subject.title} exam</p>
          <h1>All Questions</h1>
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
        <section className="question-list" aria-label="Exam questions">
          {subject.multipleChoice.map((question, index) => (
            <article className="panel question-panel" id={`question-${index + 1}`} key={question.id} aria-labelledby={`question-title-${index + 1}`}>
              <p className="question-type">Question {index + 1} of {totalQuestions} · Multiple choice</p>
              <h2 id={`question-title-${index + 1}`}>{question.text}</h2>
              <div className="options" role="radiogroup" aria-labelledby={`question-title-${index + 1}`}>
                {question.options.map((option, optionIndex) => {
                  const letter = LETTERS[optionIndex];
                  const selected = attempt.answers[index] === letter;
                  return (
                    <label className={`option ${selected ? 'selected' : ''}`} key={letter}>
                      <input
                        type="radio"
                        name={`question-${index + 1}`}
                        value={letter}
                        checked={selected}
                        onChange={() => updateAnswer(index, letter)}
                      />
                      <span className="option-letter">{letter}</span>
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}

          {subject.descriptive.map((question, index) => (
            <article className="panel question-panel" id={`question-${multipleChoiceCount + index + 1}`} key={question.id} aria-labelledby={`question-title-${multipleChoiceCount + index + 1}`}>
              <p className="question-type">Question {multipleChoiceCount + index + 1} of {totalQuestions} · Descriptive</p>
              <h2 id={`question-title-${multipleChoiceCount + index + 1}`}>{question.text}</h2>
              <label className="written-answer">
                <span>Your answer</span>
                <textarea
                  value={attempt.writtenAnswers[index]}
                  onChange={(event) => updateWrittenAnswer(index, event.target.value)}
                  placeholder="Type your answer here..."
                  rows="9"
                />
              </label>
            </article>
          ))}

          <button className="button primary-button finish-button" onClick={submitExam}>Submit Exam</button>
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
                <a
                  key={questionIndex}
                  href={`#question-${questionIndex + 1}`}
                  className={`question-number ${answered ? 'answered' : ''}`}
                  aria-label={`Question ${questionIndex + 1}${answered ? ', answered' : ''}`}
                >
                  {questionIndex + 1}
                </a>
              );
            })}
          </div>
          <div className="navigator-legend"><span className="legend-dot" /> Answered</div>
        </aside>
      </div>

      {showSubmitConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-panel" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <h2 id="confirmation-title">Are you sure you want to submit?</h2>
            <p>You can no longer change your answers after submission.</p>
            <div className="confirmation-actions">
              <button className="button secondary-button" onClick={() => setShowSubmitConfirmation(false)}>Cancel</button>
              <button className="button primary-button" onClick={confirmSubmit}>Submit Exam</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
