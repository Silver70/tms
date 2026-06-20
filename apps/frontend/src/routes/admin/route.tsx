import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

/** Layout guard for everything under /admin: requires an authenticated admin. */
export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});
