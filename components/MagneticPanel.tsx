'use client';

import { useId } from 'react';
import { Check, Magnet, Pause, Pin, Play, RefreshCw, RotateCcw, X } from 'lucide-react';
import { DEFAULT_MAGNETIC_SETTINGS, normalizeMagneticSettings, type MagneticSettings } from '@/lib/magnetic-layout';
import type { Language } from '@/lib/types';
import './magnetic-panel.css';

export interface MagneticPanelProps {
  settings: MagneticSettings;
  onChange: (settings: MagneticSettings) => void;
  language: Language;
  status: 'running' | 'settled' | 'paused';
  pinnedCount: number;
  onReheat: () => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  canApply: boolean;
  dirty: boolean;
  persistenceError?: boolean;
}

type ForceKey = 'attraction' | 'repulsion' | 'center' | 'distance';
const forceKeys: ForceKey[] = ['attraction', 'repulsion', 'center', 'distance'];
const presets = [
  { id: 'gentle', fa: 'آرام', en: 'Gentle', description: ['کشش نرم، فضای باز', 'Soft pull, room to think'], values: { attraction: .22, repulsion: .5, center: .08, distance: 180 } },
  { id: 'balanced', fa: 'متعادل', en: 'Balanced', description: ['خوشه‌های خوانا', 'Clear, balanced clusters'], values: DEFAULT_MAGNETIC_SETTINGS },
  { id: 'organic', fa: 'پویا', en: 'Organic', description: ['کشش بیشتر، شاخه‌های باز', 'Stronger pull, wider branches'], values: { attraction: .5, repulsion: .75, center: .16, distance: 230 } },
] as const;

export default function MagneticPanel({ settings, onChange, language, status, pinnedCount, onReheat, onApply, onReset, onClose, canApply, dirty, persistenceError = false }: MagneticPanelProps) {
  const id = useId();
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const locale = language === 'fa' ? 'fa' : 'en';
  const labels: Record<ForceKey, [string, string]> = {
    attraction: ['کشش ارتباط‌ها', 'Link attraction'], repulsion: ['فاصله‌گیری گره‌ها', 'Node repulsion'],
    center: ['جمع‌شدن به مرکز', 'Center gravity'], distance: ['طول ارتباط‌ها', 'Link distance'],
  };
  const hints: Record<ForceKey, [string, string]> = {
    attraction: ['فکرهای مرتبط چقدر هم را بکشند', 'How strongly linked thoughts pull together'],
    repulsion: ['گره‌ها چقدر از هم فاصله بگیرند', 'How strongly nodes push each other apart'],
    center: ['شبکه چقدر جمع‌وجور بماند', 'How compact the whole network stays'],
    distance: ['فاصلهٔ دلخواه میان فکرهای مرتبط', 'Preferred spacing between connected thoughts'],
  };
  const displayValue = (key: ForceKey) => key === 'distance'
    ? Math.round(settings[key]).toLocaleString(locale)
    : `${Math.round(settings[key] * 100).toLocaleString(locale)}${language === 'fa' ? '٪' : '%'}`;
  const change = (key: ForceKey, value: number) => onChange(normalizeMagneticSettings({ ...settings, [key]: value }));
  const statusText = status === 'running' ? L('شبکه در حرکت است', 'Finding its balance') : status === 'settled' ? L('شبکه به تعادل رسیده', 'The network is balanced') : L('حرکت متوقف است', 'Motion is paused');

  return <section className="magnetic-panel" data-magnetic-panel data-status={status} role="region" aria-labelledby={`${id}-title`} dir={language === 'fa' ? 'rtl' : 'ltr'}
    onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); onClose(); }
    }}>
    <header className="magnetic-panel-header">
      <div><span className="magnetic-panel-symbol" aria-hidden="true"><Magnet size={18} /></span><div><h2 id={`${id}-title`}>{L('مگنتِ فکرها', 'Thought magnets')}</h2><p>{L('ارتباط‌ها شکل بوم را می‌سازند', 'Let connections shape the canvas')}</p></div></div>
      <button type="button" className="magnetic-icon-button" onClick={onClose} aria-label={L('بستن تنظیمات مگنت', 'Close magnet settings')} title={L('بستن · Escape', 'Close · Escape')}><X size={17} /></button>
    </header>

    <div className="magnetic-play-row">
      <span className="magnetic-status" role="status"><i aria-hidden="true" />{statusText}</span>
      <button type="button" className={`magnetic-play ${settings.enabled ? 'is-running' : ''}`} aria-pressed={settings.enabled} onClick={() => onChange({ ...settings, enabled: !settings.enabled })}>
        {settings.enabled ? <Pause size={14} /> : <Play size={14} />}{settings.enabled ? L('توقف', 'Pause') : L('شروع', 'Start')}
      </button>
    </div>

    <div className="magnetic-panel-body">
    <div className="magnetic-presets" role="group" aria-label={L('حالت‌های پیشنهادی مگنت', 'Magnet presets')}>
      {presets.map(preset => {
        const active = forceKeys.every(key => Math.abs(settings[key] - preset.values[key]) < .001);
        return <button type="button" key={preset.id} aria-pressed={active} title={preset.description[language === 'fa' ? 0 : 1]} onClick={() => onChange(normalizeMagneticSettings({ ...preset.values, enabled: true }))}>
          <span className={`magnetic-preset-mark preset-${preset.id}`} aria-hidden="true"><i /><i /><i /></span><span>{language === 'fa' ? preset.fa : preset.en}</span>{active && <Check size={11} />}
        </button>;
      })}
    </div>

    <div className="magnetic-forces">
      {forceKeys.map(key => <div className="magnetic-force" key={key}>
        <div><label htmlFor={`${id}-${key}`}>{labels[key][language === 'fa' ? 0 : 1]}</label><output htmlFor={`${id}-${key}`}>{displayValue(key)}</output></div>
        <input id={`${id}-${key}`} type="range" min={key === 'distance' ? 60 : 0} max={key === 'distance' ? 420 : 1} step={key === 'distance' ? 10 : .01} value={settings[key]} aria-valuetext={displayValue(key)} aria-describedby={`${id}-${key}-hint`} onChange={event => change(key, Number(event.currentTarget.value))} />
        <p id={`${id}-${key}-hint`}>{hints[key][language === 'fa' ? 0 : 1]}</p>
      </div>)}
    </div>

    <div className="magnetic-secondary-row">
      <span className="magnetic-pin-count"><Pin size={12} />{Math.max(0, pinnedCount).toLocaleString(locale)} {L('گره ثابت', 'pinned')}</span>
      <button type="button" className="magnetic-text-button" disabled={!settings.enabled} onClick={onReheat}><RefreshCw size={12} />{L('حرکت دوباره', 'Rebalance')}</button>
    </div>
    <p className="magnetic-help">{L('یک گره را بکش تا شبکه واکنش نشان دهد. حرکت در نمای توست؛ «ثبت چیدمان» جای نودها را در بوم ذخیره می‌کند.', 'Drag a node and the network responds. Motion belongs to your view; Apply layout saves these positions to the board.')}</p>
    {persistenceError && <p className="magnetic-storage-error" role="alert">{L('مرورگر نتوانست نمای شخصی را نگه دارد. برای حفظ جای نودها، چیدمان را ثبت کن.', 'The browser could not retain your personal view. Apply the layout to keep these node positions.')}</p>}
    </div>
    <footer className="magnetic-panel-footer">
      <button type="button" className="magnetic-reset" onClick={onReset} disabled={!dirty && pinnedCount === 0} title={L('بازگشت به جای ذخیره‌شدهٔ نودها', 'Return to saved node positions')}><RotateCcw size={14} />{L('بازگشت', 'Restore')}</button>
      <button type="button" className="primary-button magnetic-apply" onClick={onApply} disabled={!canApply || !dirty}><Check size={15} />{L('ثبت چیدمان', 'Apply layout')}</button>
    </footer>
  </section>;
}
