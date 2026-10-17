import { RouterProvider } from 'react-router';
import { router } from './routes';
import { DirectoryProvider } from './Directory';

export default function App() {
  return <DirectoryProvider><RouterProvider router={router} /></DirectoryProvider>;
}
