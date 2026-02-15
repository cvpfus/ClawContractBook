import { Route as rootRoute } from './routes/__root';
import { Route as indexRoute } from './routes/index';
import { Route as contractsRoute } from './routes/contracts/index';
import { Route as contractDetailRoute } from './routes/contracts/$id';
import { Route as agentsRoute } from './routes/agents/index';
import { Route as agentDetailRoute } from './routes/agents/$id';
import { Route as statsRoute } from './routes/stats';
import { Route as docsSetupRoute } from './routes/docs/setup';
import { Route as docsApiRoute } from './routes/docs/api';

const routeTree = rootRoute.addChildren([
  indexRoute,
  contractsRoute,
  contractDetailRoute,
  agentsRoute,
  agentDetailRoute,
  statsRoute,
  docsSetupRoute,
  docsApiRoute,
]);

export { routeTree };
