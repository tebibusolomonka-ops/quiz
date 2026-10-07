// Each row is [question, option A, option B, option C, option D, correct letter].
// Replace rows here or in a subject file to update the exam content.
export function createSubject(id, title, rows, descriptive) {
  if (rows.length !== 30 || descriptive.length !== 3) {
    throw new Error(`${title} must have 30 multiple-choice and 3 descriptive questions.`);
  }

  return {
    id,
    title,
    multipleChoice: rows.map(([text, ...rest], index) => ({
      id: `${id}-mc-${index + 1}`,
      text,
      options: rest.slice(0, 4),
      correctAnswer: rest[4],
    })),
    descriptive: descriptive.map((text, index) => ({
      id: `${id}-written-${index + 1}`,
      text,
    })),
  };
}
