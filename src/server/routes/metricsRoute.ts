const express = require('express');
const metricsRoute = express.Router();
import {
  TypedResponse as TR,
  TypedRequestQuery as TRQ,
  TypedRequestBody as TRB
} from '../../Types';

metricsRoute.get('/metrics', (req: TRQ<{}>, res: TR<{message: string}>) => {
  res.json({ message: 'Metrics route' });
});

export { metricsRoute };