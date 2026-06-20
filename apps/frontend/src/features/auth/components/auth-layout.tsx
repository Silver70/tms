import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Full-screen split layout (login-02): branded form column + image column. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-bold">
              IB
            </span>
            Island Booking
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden lg:block">
        <img
          src="/images/rose-red-wall.png"
          alt="an abstract background"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
