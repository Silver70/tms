import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthLayout, SignupForm } from '~/features/auth';

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/' });
    }
  },
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
