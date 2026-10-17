import { Navigate, createBrowserRouter } from 'react-router';
import { AppLayout } from '../components/layout';
import { Dashboard } from '../pages/Dashboard';
import { FlowsPage, HistoryPage, SettingsPage } from '../pages/ResourcePages';
import { TicketDetail } from '../pages/TicketDetail';
import { TicketsPage } from '../pages/TicketsPage';
import { TicketWizard } from '../pages/TicketWizard';
import { UserForm, UsersPage } from '../pages/UsersPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'chamados', Component: TicketsPage },
      { path: 'chamados/novo', Component: TicketWizard },
      { path: 'chamados/:id', Component: TicketDetail },
      { path: 'chamados/:id/editar', Component: TicketWizard },
      { path: 'chamados/:id/fluxos', Component: TicketDetail },
      { path: 'chamados/:id/fluxos/:fluxoId', Component: TicketDetail },
      { path: 'usuarios', Component: UsersPage },
      { path: 'usuarios/novo', Component: UserForm },
      { path: 'usuarios/:id/editar', Component: UserForm },
      { path: 'meus-chamados', element: <TicketsPage mine /> },
      { path: 'fluxos', Component: FlowsPage },
      { path: 'historico', Component: HistoryPage },
      { path: 'configuracoes', Component: SettingsPage },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
