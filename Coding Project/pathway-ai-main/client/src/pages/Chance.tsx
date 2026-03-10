import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Search, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Chance() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useMemo(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);
  const { data } = trpc.universities.list.useQuery({ search: debouncedSearch, country: "all", type: "all", page: 1, limit: 20 });
  const predict = trpc.ai.predictChance.useMutation({ onError: (err) => toast.error(err.message ?? "Complete your profile first for better predictions.") });
  const [results, setResults] = useState<Record<number, any>>({});

  const handlePredict = async (uniId: number) => {
    const res = await predict.mutateAsync({ universityId: uniId });
    setResults(r => ({ ...r, [uniId]: res }));
  };

  const getVerdictStyle = (verdict: string, chance: number) => {
    if (verdict === "Safety" || chance >= 70) return { badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" };
    if (verdict === "Reach" || verdict === "Likely Reach" || chance < 40) return { badge: "bg-orange-100 text-orange-800", bar: "bg-orange-500" };
    return { badge: "bg-blue-100 text-blue-800", bar: "bg-blue-500" };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="w-6 h-6 text-amber-500" />Chance Predictor</h1>
        <p className="text-muted-foreground mt-1">Get AI-powered admission probability for any university.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search for a university..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="space-y-3">
        {(data?.universities ?? []).map(uni => {
          const result = results[uni.id];
          const chance = result?.chance ?? result?.predictedScore;
          const style = result ? getVerdictStyle(result.verdict, chance) : null;
          return (
            <Card key={uni.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span>{uni.country === "US" ? "🇺🇸" : "🇬🇧"}</span>
                      <h3 className="font-semibold text-sm truncate">{uni.name}</h3>
                    </div>
                    {uni.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{uni.city}</p>}
                    {uni.acceptanceRate && <p className="text-xs text-muted-foreground">Overall: {Number(uni.acceptanceRate).toFixed(0)}% acceptance</p>}
                  </div>
                  {result ? (
                    <div className="text-right shrink-0 min-w-[120px]">
                      <p className="text-2xl font-bold">{chance}%</p>
                      <Badge className={`text-xs ${style!.badge}`}>{result.verdict ?? result.category}</Badge>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handlePredict(uni.id)} disabled={predict.isPending} className="shrink-0 gap-1.5">
                      <Star className="w-3.5 h-3.5" />{predict.isPending ? "..." : "Predict"}
                    </Button>
                  )}
                </div>
                {result && (
                  <div className="mt-3 space-y-3">
                    {/* Colored gauge */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${style!.bar}`} style={{ width: `${chance}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{result.summary ?? result.explanation}</p>
                    {result.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700 mb-1">Strengths</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {result.strengths.map((s: string, i: number) => <li key={i}>✓ {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-orange-700 mb-1">Weaknesses</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {result.weaknesses.map((w: string, i: number) => <li key={i}>✗ {w}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.tips?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Tips</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {result.tips.map((t: string, i: number) => <li key={i}>→ {t}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
