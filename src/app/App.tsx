import { RouterProvider } from 'react-router';
import { router } from './routes';
import { DirectoryProvider, useDirectory } from './Directory';
import { NotificationProvider } from '../notifications/NotificationProvider';

export default function App() {
  return <DirectoryProvider><NotificationsApp /></DirectoryProvider>;
}

function NotificationsApp() {
  const { actorId } = useDirectory();
  return <NotificationProvider identityKey={actorId || null}><RouterProvider router={router} /></NotificationProvider>;
}
