import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthLayout, LoginForm, loginSearchSchema } from '~/features/auth';

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ to: search.redirect || '/' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  return (
    <AuthLayout>
      <LoginForm redirectTo={search.redirect} />
    </AuthLayout>
  );
}
