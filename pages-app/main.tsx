import React from 'react';
import {createRoot} from 'react-dom/client';
import CricketGame from '../app/page';
import '../app/crease.css';
import '../app/arena.css';
createRoot(document.getElementById('root')!).render(<CricketGame/>);
