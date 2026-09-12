import { notFound } from "next/navigation";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDatabase } from "@/lib/db";

type FichePageProps = {
  params: Promise<{ id: string }>;
};

export default async function FichePage({ params }: FichePageProps) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero < 1) {
    notFound();
  }

  const fiche = await getDatabase().fiches.getByNumero(numero);
  if (!fiche) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Heading level={1}>Fiche n°{fiche.numero}</Heading>
        <Badge variant={fiche.status === "validee" ? "default" : "secondary"}>
          {fiche.status === "validee" ? "Validée" : "Brouillon"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{fiche.theme ?? "Sans thème"}</CardTitle>
          <CardDescription>{fiche.category ?? "Thème libre"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            La génération du contenu arrivera à l&apos;étape suivante.
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
