import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Brain, RefreshCw, Sparkles, Calendar, DollarSign, Plus } from "lucide-react";

type PathwayUniversity = {
  name: string;
  country: "US" | "UK";
  program: string;
  admissionChance: number;
  reasoning: string;
  deadline: string;
  tuition: string;
};

const CAT: Record<string, { label: string; border: string; badge: string; bar: string }> = {
  safety: {
    label: "Safety Schools",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
  },
  target: {
    label: "Target Schools",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    bar: "bg-blue-500",
  },
  reach: {
    label: "Reach Schools",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
    bar: "bg-orange-500",
  },
};

export default function Pathway() {
  const { data: saved } = trpc.ai.getSavedPathway.useQuery();
  const generate = trpc.ai.generatePathway.useMutation({
    onError: (err) => toast.error(err.message ?? "Failed to generate pathway"),
  });

  const [pathway, setPathway] = useState<{
    safety: PathwayUniversity[];
    target: PathwayUniversity[];
    reach: PathwayUniversity[];
    cached?: boolean;
  } | null>(null);

  const displayed = pathway ?? (saved
    ? {
        safety: saved.safety as PathwayUniversity[],
        target: saved.target as PathwayUniversity[],
        reach: saved.reach as PathwayUniversity[],
        cached: true,
      }
    : null);

  const handleGenerate = async (force = false) => {
    const result = await generate.mutateAsync({ force });
    setPathway(result);
    if (result.cached && !force) {
      toast.info("Showing your saved pathway — click Regenerate to refresh.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-teal-600" />Smart Pathway Builder
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered university list tailored to your academic profile.
        </p>
      </div>

      {!displayed ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center">
            <Sparkles className="w-10 h-10 text-teal-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Generate Your University Pathway</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Our AI will create a personalised list of Safety, Target, and Reach schools based on your full profile.
            </p>
            <Button
              onClick={() => handleGenerate(false)}
              disabled={generate.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {generate.isPending ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing your profile...</>
              ) : (
                <><Brain className="w-4 h-4" />Generate My Pathway</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {displayed.cached ? "Saved pathway" : "Fresh AI-generated pathway"} · 9 universities
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(true)}
              disabled={generate.isPending}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generate.isPending ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>

          {(["safety", "target", "reach"] as const).map((cat) => {
            const unis = displayed[cat] ?? [];
            if (!unis.length) return null;
            const style = CAT[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold">{style.label}</h2>
                  <Badge className={`text-xs ${style.badge}`}>{unis.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unis.map((u, i) => (
                    <Card key={i} className={`hover:shadow-md transition-shadow border ${style.border}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span>{u.country === "US" ? "🇺🇸" : "🇬🇧"}</span>
                              <Badge className={`text-xs ${style.badge}`}>
                                {style.label.replace(" Schools", "")}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-sm leading-tight">{u.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{u.program}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-bold">{u.admissionChance}%</p>
                            <p className="text-xs text-muted-foreground">chance</p>
                          </div>
                        </div>

                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${style.bar}`}
                            style={{ width: `${u.admissionChance}%` }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground italic">{u.reasoning}</p>

                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{u.deadline}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />{u.tuition}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7 gap-1"
                          onClick={() => toast.info("Search for this university to add it to your tracker.")}
                        >
                          <Plus className="w-3 h-3" />Add to Tracker
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
