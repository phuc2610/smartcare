// Re-export API wrapper for backward compatibility
// All services should migrate to use api-wrapper directly
export { api as default } from '../utils/api-wrapper';
export type { ApiResult } from '../utils/api-wrapper';

