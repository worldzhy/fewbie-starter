"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import PageShell from "@/fewbie/framework/page/page-shell";
import { EmptyState } from "@/fewbie/framework/states/empty-state";
import { ErrorState } from "@/fewbie/framework/states/error-state";
import { LoadingState } from "@/fewbie/framework/states/loading-state";
import { Button } from "@/fewbie/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/fewbie/ui/card";
import { apiClient } from "@/lib/api-client";

/**
 * Domain query key (R11): a stable constant, never an inline literal, so a
 * mutation can invalidate exactly this cache entry by importing the same name.
 */
export const currentAccountQueryKey = ["account", "current"] as const;

/** The subset of `GET /account/me` this reference page renders. */
interface CurrentAccount {
  id: string;
  email: string | null;
  phone: string | null;
}

/**
 * Reference page for the data mechanism (devbie ADR-079).
 *
 * It is the shape every host page follows: a client component, one `useQuery`
 * through the framework api-client (so the token gate, the silent refresh and
 * the error channel all apply), a domain query key, and the shared
 * loading/empty/error states. Replace the endpoint and the rendered fields with
 * your own domain; keep the shape.
 */
export default function Home() {
  const t = useTranslations("home");

  return (
    <PageShell width="default" title={t("title")} subtitle={t("description")}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t("editHint")}</p>
          <Button asChild variant="outline">
            <a href="https://ui.shadcn.com/docs">{t("docs")}</a>
          </Button>
        </div>
        <CurrentAccountCard />
      </div>
    </PageShell>
  );
}

function CurrentAccountCard() {
  const t = useTranslations("home");
  const common = useTranslations("framework.common");
  const query = useQuery({
    queryKey: currentAccountQueryKey,
    queryFn: () => apiClient.get<CurrentAccount>("/account/me"),
  });

  if (query.isPending) return <LoadingState label={common("loading")} />;

  if (query.isError) {
    return (
      <ErrorState
        title={t("accountErrorTitle")}
        description={query.error instanceof Error ? query.error.message : undefined}
        retryLabel={common("retry")}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const account = query.data;
  if (!account) return <EmptyState title={t("accountEmptyTitle")} />;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("accountTitle")}</CardTitle>
        <CardDescription>{t("accountDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">{t("accountEmail")}</dt>
          <dd className="break-all">{account.email ?? t("accountMissingValue")}</dd>
          <dt className="text-muted-foreground">{t("accountPhone")}</dt>
          <dd>{account.phone ?? t("accountMissingValue")}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
