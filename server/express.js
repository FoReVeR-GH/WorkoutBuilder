import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compress from 'compression';
import cors from 'cors';
import helmet from 'helmet';

// modules for server side rendering
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import StaticRouter from 'react-router-dom/StaticRouter';

import { SheetsRegistry } from 'react-jss/lib/jss';
import JssProvider from 'react-jss/lib/JssProvider';
import { MuiThemeProvider, createMuiTheme, createGenerateClassName } from '@material-ui/core/styles';
import { indigo, pink } from '@material-ui/core/colors';
// end

// comment out before building for production
import { Provider } from 'react-redux';
import devBundle from './devBundle';

import MainRouter from '../client/MainRouter';
import routineRoutes from './routes/routine.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import Template from '../template';
import configureStore from '../redux/configureStore';

const store = configureStore();

const CURRENT_WORKING_DIR = process.cwd();
const app = express();

// comment out before building for production
devBundle.compile(app);

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compress());
// secure apps by setting various HTTP headers
app.use(helmet());
// enable CORS - Cross Origin Resource Sharing
app.use(cors());

app.use('/dist', express.static(path.join(CURRENT_WORKING_DIR, 'dist')));
app.use('/assets', express.static(path.join(CURRENT_WORKING_DIR, 'client/assets')));
app.use(express.static(path.join(CURRENT_WORKING_DIR, 'sw')));

// mount routes
app.use('/', userRoutes);
app.use('/', authRoutes);
app.use('/', routineRoutes);

app.get('*', (req, res) => {
  const sheetsRegistry = new SheetsRegistry();
  const theme = createMuiTheme({
    palette: {
      primary: {
        light: '#fff',
        main: '#333',
        dark: '#002984',
        contrastText: '#fff',
      },
      secondary: {
        light: '#ff79b0',
        main: '#ff4081',
        dark: '#c60055',
        contrastText: '#000',
      },
      openTitle: indigo['400'],
      protectedTitle: pink['400'],
      type: 'light',
    },
  });
  const generateClassName = createGenerateClassName();
  const context = {};
  const markup = ReactDOMServer.renderToString(
    <Provider store={store}>
      <StaticRouter location={req.url} context={context}>
        <JssProvider registry={sheetsRegistry} generateClassName={generateClassName}>
          <MuiThemeProvider theme={theme} sheetsManager={new Map()}>
            <MainRouter />
          </MuiThemeProvider>
        </JssProvider>
      </StaticRouter>
    </Provider>,
  );
  if (context.url) {
    return res.redirect(303, context.url);
  }
  const css = sheetsRegistry.toString();
  res.status(200).send(Template({
    markup,
    css,
  }));
});

// Catch unauthorised errors
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: `${err.name}: ${err.message}` });
  }
});

export default app;
