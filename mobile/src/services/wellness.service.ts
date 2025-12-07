import { api } from '../utils/api-wrapper';
import { logger } from '../utils/logger';
import { queueOperation } from './sync.service';

export const logWellnessSession = async (
  type: 'breathing' | 'music',
  durationSeconds: number
): Promise<void> => {
  const result = await api.post('/api/wellness/log', { type, durationSeconds });
  
  if (result.ok) {
    logger.api('Log wellness session SUCCESS - saved to MongoDB', { status: result.status });
    return;
  }
  
  // Nếu API fail, queue để sync sau
  logger.api('Log wellness session failed, queueing for sync', result.error);
  await queueOperation({
    type: 'CREATE_HEALTH_LOG', // Reuse health log queue
    data: { type, durationSeconds },
  });
};





