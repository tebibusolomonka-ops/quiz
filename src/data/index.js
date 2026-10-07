import { mathematics } from './mathematics.js';
import { physics } from './physics.js';
import { economics } from './economics.js';
import { history } from './history.js';
import { biology } from './biology.js';
import { chemistry } from './chemistry.js';

export const subjects = [mathematics, physics, economics, history, biology, chemistry];

export const getSubject = (id) => subjects.find((subject) => subject.id === id);
