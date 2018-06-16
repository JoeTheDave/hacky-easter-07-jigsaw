import React from 'react';
import { render } from 'react-dom';
import { JssProvider } from 'react-jss';
import './index.css';
import jssInstance from './jssInstance';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

const content = (
  <JssProvider jss={jssInstance}>
    <App />
  </JssProvider>
);

const root = document.getElementById('root');
render(content, root);
registerServiceWorker();
