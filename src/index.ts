import { Hono } from 'hono';
import { getRequestListener } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { apiDossiers } from './routes/api.dossiers';
import { apiConfig } from './routes/api.config';
import { apiStats } from './routes/api.stats';
import { apiDemo } from './routes/api.demo';
import { internalTriggers } from './routes/internal.triggers';
import { internalMenu } from './routes/internal.menu';
import { requireModerator } from './middleware/require-moderator';

const app = new Hono();

app.use('/api/*', requireModerator);

app.post('/internal/triggers/on-app-install', (c) => c.json({}, 200));

app.route('/', apiDossiers);
app.route('/', apiConfig);
app.route('/', apiStats);
app.route('/', apiDemo);

app.route('/', internalTriggers);
app.route('/', internalMenu);

const listener = getRequestListener(app.fetch);
createServer(listener).listen(getServerPort());
