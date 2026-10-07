# Simple Exams

A frontend-only practice exam built with React and plain CSS. It includes six subjects, each with 30 multiple-choice questions and 3 descriptive questions.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`.

## Change the questions

Edit the subject files in `src/data/`. Each multiple-choice row contains the question, four answer options, and the correct letter. Each subject also has three descriptive prompts. The data structure is documented in `src/data/createSubject.js`.

The one-hour timer and answers are stored in the browser's localStorage. There is no backend or account system; descriptive answers are counted but not graded.
