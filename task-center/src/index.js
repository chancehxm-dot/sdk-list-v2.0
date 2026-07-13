import { init, onBrowserClose, refresh, reload, destroy } from './core.js';

const TaskCenter = {
  init,
  onBrowserClose,
  refresh,
  reload,
  destroy
};

if (typeof window !== 'undefined') {
  window.TaskCenter = TaskCenter;
}

export { TaskCenter, init, onBrowserClose, refresh, reload, destroy };
export default TaskCenter;
