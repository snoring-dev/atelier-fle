"use client";

import { useActionState } from "react";
import { type CreateFicheState, createFicheAction } from "@/app/(app)/actions";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { THEME_CATALOG } from "@/lib/themes/catalog";
import { cn } from "@/lib/utils";

const initialState: CreateFicheState = {};

type ThemePickerProps = {
  greyedCategories: string[];
};

export function ThemePicker({ greyedCategories }: ThemePickerProps) {
  const greyed = new Set(greyedCategories);
  const [state, action, pending] = useActionState(
    createFicheAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level={1}>Nouvelle séance</Heading>
          <Text className="mt-1 text-muted-foreground">
            Choisissez un thème, tirez au hasard, ou saisissez le vôtre.
          </Text>
        </div>
        <form action={action}>
          <input type="hidden" name="mode" value="random" />
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Création…" : "Au hasard"}
          </Button>
        </form>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {THEME_CATALOG.map((category) => {
          const disabled = greyed.has(category.name) || pending;
          return (
            <Card
              key={category.name}
              size="sm"
              className={cn(
                disabled && "opacity-50",
                greyed.has(category.name) && "bg-muted/40",
              )}
            >
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                {greyed.has(category.name) ? (
                  <Text as="span" className="text-xs text-muted-foreground">
                    Utilisée récemment
                  </Text>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {category.themes.map((theme) => (
                  <form key={theme} action={action}>
                    <input type="hidden" name="mode" value="catalog" />
                    <input type="hidden" name="theme" value={theme} />
                    <input
                      type="hidden"
                      name="category"
                      value={category.name}
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left font-normal"
                    >
                      {theme}
                    </Button>
                  </form>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thème libre</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="mode" value="free" />
            <div className="flex min-w-64 flex-1 flex-col gap-1.5">
              <label htmlFor="free-theme" className="text-sm font-medium">
                Votre thème
              </label>
              <Input
                id="free-theme"
                name="theme"
                placeholder="Ex. Une journée à la plage"
                maxLength={80}
                required
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer la fiche"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
