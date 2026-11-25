import { motion } from 'framer-motion';
import { ArrowRight, ScanText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Analyzer, type EditableTopic } from '@/components/Analyzer';
import { SubjectIcon } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { celebrate, cn, minutes } from '@/lib/utils';

export default function Analyze() {
  const { subjects, handleReport } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const active = subjects.filter((s) => s.daysLeft >= 0);
  const [target, setTarget] = useState(params.get('subject') ?? active[0]?.id ?? '');
  const [topics, setTopics] = useState<EditableTopic[]>([]);
  const [saving, setSaving] = useState(false);
  const selected = topics.filter((t) => t.selected && t.title.trim());
  const subject = subjects.find((s) => s.id === target);

  const save = async () => {
    if (!target) return toast.error('Wybierz przedmiot docelowy.');
    setSaving(true);
    try {
      const r = await api.addTopics(target, selected.map(({ title, difficulty, estMinutes }) => ({ title, difficulty, estMinutes })));
      handleReport(r.report);
      celebrate(1);
      toast.success(`Dodano ${r.topics.length} tematów do „${subject?.name}”`, { description: 'Plan został automatycznie przeliczony.' });
      nav(`/app/subjects?id=${target}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow={<><ScanText className="h-3.5 w-3.5" />Moduł 2</>} title={<>Analiza materiałów <span className="text-gradient">AI</span></>}
        subtitle="Wklej sylabus lub notatki. AI wyodrębni listę tematów, oszacuje trudność i czas nauki. Zanim trafią do planu, możesz je zatwierdzić i poprawić." />

      <Card className="p-5 sm:p-7" spotlight={false}>
        <Analyzer onResult={setTopics} accent={subject?.color} />
      </Card>

      <motion.div initial={false} animate={{ opacity: selected.length ? 1 : 0.4, y: 0 }} className={cn('sticky bottom-4 z-10 mt-6', !selected.length && 'pointer-events-none')}>
        <div className="glass-strong flex flex-col gap-4 rounded-2xl p-4 shadow-2xl sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            {subject && <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />}
            <div className="text-sm">
              <div className="font-semibold text-white">{selected.length} tematów · {minutes(selected.reduce((a, t) => a + t.estMinutes, 0))}</div>
              <div className="flex items-center gap-1 text-xs text-zinc-500"><ShieldCheck className="h-3 w-3 text-emerald-400" />Zatwierdzone przez Ciebie przed dodaniem</div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="input sm:w-64">
              {!active.length && <option value="">Brak przedmiotów – utwórz w Kreatorze</option>}
              {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button onClick={save} loading={saving} disabled={!target || !selected.length} icon={<ArrowRight className="h-4 w-4" />}>Dodaj do planu</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
