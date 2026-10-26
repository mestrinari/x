import { setupFetchInterceptor } from './networkLogger';
import { installConsoleInterceptor } from './consoleLogger';
import { setupDevTimeline } from './devTimeline';
import { setupDevErrorMonitor } from './devErrorMonitor';
import { setupPerformanceMonitor } from './performanceMonitor';

export function startDevTools() {
  const runtime = window as Window & { orbitDevToolsStarted?: boolean };
  if (runtime.orbitDevToolsStarted) return;
  runtime.orbitDevToolsStarted = true;
  setupFetchInterceptor();
  installConsoleInterceptor();
  setupDevTimeline();
  setupDevErrorMonitor();
  setupPerformanceMonitor();
}
