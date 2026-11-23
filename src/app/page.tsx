import { getTranslations } from "next-intl/server";

import { Button } from "@/fewbie/ui/button";
import PageShell from "@/fewbie/framework/page/page-shell";

export default async function Home() {
  const t = await getTranslations("home");

  return (
    <PageShell width="default" title={t("title")} subtitle={t("description")}>
      <div className="flex flex-col items-start gap-4">
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t("editHint")}</p>
        <Button asChild>
          <a href="https://ui.shadcn.com/docs">{t("docs")}</a>
        </Button>
      </div>
    </PageShell>
  );
}
