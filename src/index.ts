import { Hono } from 'hono';
import { getRequestListener } from '@hono/node-server';
import { listenWithDevvitServer } from './devvit/server';
import { apiDossiers } from './routes/api.dossiers';
import { apiActions } from './routes/api.actions';
import { apiConfig } from './routes/api.config';
import { apiStats } from './routes/api.stats';
import { apiHealth } from './routes/api.health';
import { apiReview } from './routes/api.review';
import { internalTriggers } from './routes/internal.triggers';
import { internalMenu } from './routes/internal.menu';
import { requireModerator } from './middleware/require-moderator';

const app = new Hono();

app.use('/api/*', requireModerator);

app.route('/', apiDossiers);
app.route('/', apiActions);
app.route('/', apiConfig);
app.route('/', apiStats);
app.route('/', apiHealth);
app.route('/', apiReview);

app.route('/', internalTriggers);
app.route('/', internalMenu);

const listener = getRequestListener(app.fetch);
listenWithDevvitServer(listener);
